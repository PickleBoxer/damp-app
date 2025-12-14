// Extensions that come pre-installed with the container (always included)
export const PREINSTALLED_PHP_EXTENSIONS = [
  'ctype',
  'curl',
  'dom',
  'fileinfo',
  'filter',
  'hash',
  'mbstring',
  'openssl',
  'pcre',
  'session',
  'tokenizer',
  'xdebug',
  'xml',
  'opcache',
  'mysqli',
  'pcntl',
  'pdo_mysql',
  'pdo_pgsql',
  'redis',
  'zip',
] as const;

// Additional extensions users can optionally install
export const ADDITIONAL_PHP_EXTENSIONS = [
  'bcmath',
  'gd',
  'intl',
  'memcached',
  'imagick',
  'soap',
  'xsl',
  'apcu',
  'sodium',
  'exif',
  'ldap',
  'pgsql',
] as const;
