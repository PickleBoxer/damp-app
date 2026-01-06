import type { ForgeConfig } from '@electron-forge/shared-types';
import type { Module } from 'flora-colossus';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { PublisherS3 } from '@electron-forge/publisher-s3';
import { Walker, DepType } from 'flora-colossus';
import path from 'node:path';
import { cp, mkdir } from 'node:fs/promises';

type CopyClass<T> = {
  [P in keyof T]: T[P];
};

type CustomWalker = CopyClass<Walker> & {
  modules: Module[];
  walkDependenciesForModule: (moduleRoot: string, depType: DepType) => Promise<void>;
};

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: './resources/icons/icon',
    extraResource: ['resources/bin', 'resources/icons'],
  },
  rebuildConfig: {
    // Rebuild native modules for Electron's ABI
    onlyModules: ['dockerode', '@vscode/sudo-prompt'],
    force: true,
  },
  makers: [
    new MakerSquirrel({
      remoteReleases: 'https://releases.getdamp.app/win32/x64',
    }),
    new MakerZIP({}, ['win32']),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main/index.ts',
          config: 'vite.main.config.mts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.mts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    async packageAfterCopy(_forgeConfig, buildPath) {
      // Copy external dependencies
      const externalDependencies = ['dockerode', '@vscode/sudo-prompt'];
      const depsToCopy = new Set<string>(externalDependencies);

      const sourceNodeModulesPath = path.resolve(__dirname, 'node_modules');
      const destNodeModulesPath = path.resolve(buildPath, 'node_modules');

      for (const dep of externalDependencies) {
        const walker = new Walker(path.join(sourceNodeModulesPath, dep)) as unknown as CustomWalker;

        await walker.walkDependenciesForModule(path.join(sourceNodeModulesPath, dep), DepType.PROD);

        walker.modules.forEach(treeDep => {
          depsToCopy.add(treeDep.name);
        });
      }

      await Promise.all(
        Array.from(depsToCopy.values()).map(async packageName => {
          const sourcePath = path.join(sourceNodeModulesPath, packageName);
          const destPath = path.join(destNodeModulesPath, packageName);

          await mkdir(path.dirname(destPath), { recursive: true });
          await cp(sourcePath, destPath, { recursive: true, preserveTimestamps: true });
        })
      );
    },
  },
  publishers: [
    new PublisherS3({
      endpoint: process.env.R2_ENDPOINT,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      region: 'auto',
      bucket: process.env.R2_BUCKET || '',
      public: true,
      keyResolver: (fileName, platform, arch) => {
        return `${platform}/${arch}/${fileName}`;
      },
    }),
  ],
};

export default config;
