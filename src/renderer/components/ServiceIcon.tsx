import ValkeyIcon from '@renderer/assets/valkey';
import TypesenseIcon from '@renderer/assets/typesense';
import MailpitIcon from '@renderer/assets/mailpit';
import MemcachedIcon from '@renderer/assets/memcached';
import React from 'react';
import {
  SiCaddy,
  SiMysql,
  SiPostgresql,
  SiMariadb,
  SiMongodb,
  SiRedis,
  SiMeilisearch,
  SiMinio,
  SiRabbitmq,
} from 'react-icons/si';
import { FaQuestionCircle } from 'react-icons/fa';

interface ServiceIconProps {
  serviceId: string;
  className?: string;
}

const serviceColors: Record<string, string> = {
  caddy: '#0F7C8E',
  mysql: '#4479A1',
  mailpit: '#FF6F61',
  postgresql: '#336791',
  mariadb: '#003545',
  mongodb: '#47A248',
  redis: '#DC382D',
  meilisearch: '#FF5A5F',
  minio: '#C72E2F',
  memcached: '#00BFAE',
  rabbitmq: '#FF6600',
  typesense: '#FF2B6A',
  valkey: '#00B2B2',
};

const iconMap: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  caddy: SiCaddy,
  mysql: SiMysql,
  postgresql: SiPostgresql,
  mariadb: SiMariadb,
  mongodb: SiMongodb,
  redis: SiRedis,
  meilisearch: SiMeilisearch,
  minio: SiMinio,
  rabbitmq: SiRabbitmq,
};

export function ServiceIcon({ serviceId, className = 'w-10 h-10' }: Readonly<ServiceIconProps>) {
  const color = serviceColors[serviceId] || '#333';
  let IconComponent:
    | React.ComponentType<{ className?: string; style?: React.CSSProperties }>
    | undefined;
  switch (serviceId) {
    case 'valkey':
      IconComponent = ValkeyIcon;
      break;
    case 'typesense':
      IconComponent = TypesenseIcon;
      break;
    case 'memcached':
      IconComponent = MemcachedIcon;
      break;
    case 'mailpit':
      IconComponent = MailpitIcon;
      break;
    default:
      IconComponent = iconMap[serviceId] || FaQuestionCircle;
      break;
  }
  return <IconComponent className={className} style={{ color }} />;
}
