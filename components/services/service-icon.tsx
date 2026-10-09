import type { ComponentType, SVGProps } from 'react';
import {
  BagIcon,
  CarIcon,
  ChatIcon,
  ExchangeIcon,
  RupeeIcon,
  ShieldIcon,
  TagIcon,
  WrenchIcon,
} from '@/components/ui/icons';
import type { ServiceIcon as ServiceIconKey } from '@/lib/validation/content';

const ICONS: Record<ServiceIconKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  car: CarIcon,
  tag: TagIcon,
  exchange: ExchangeIcon,
  wrench: WrenchIcon,
  bag: BagIcon,
  finance: RupeeIcon,
  shield: ShieldIcon,
  chat: ChatIcon,
};

export function ServiceIcon({ icon, ...props }: { icon: ServiceIconKey } & SVGProps<SVGSVGElement>) {
  const Icon = ICONS[icon];
  return <Icon {...props} />;
}
