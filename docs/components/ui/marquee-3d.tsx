import { ComponentPropsWithoutRef, Children } from 'react';

import { cn } from '@/lib/utils';
import { Marquee } from '@/components/ui/marquee';

interface Marquee3DProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * Optional CSS class name to apply custom styles
   */
  className?: string;
  /**
   * Whether to pause the animation on hover
   * @default false
   */
  pauseOnHover?: boolean;
  /**
   * Content to be displayed in the marquee columns
   */
  children: React.ReactNode;
}

export function Marquee3D({ className, pauseOnHover = false, children, ...props }: Marquee3DProps) {
  // Split children into 3 columns using React.Children.toArray for proper ReactNode handling
  const childrenArray = Children.toArray(children);
  const columnCount = 3;
  const itemsPerColumn = Math.ceil(childrenArray.length / columnCount);

  const columns = Array.from({ length: columnCount }, (_, i) =>
    childrenArray.slice(i * itemsPerColumn, (i + 1) * itemsPerColumn)
  );

  return (
    <div
      {...props}
      className={cn(
        'absolute inset-0 flex h-full w-full flex-row items-center justify-center gap-4 overflow-hidden perspective-near',
        className
      )}
    >
      <div
        className="flex flex-row items-center gap-4"
        style={{
          transform:
            'translateX(-100px) translateY(0px) translateZ(-100px) rotateX(20deg) rotateY(-10deg) rotateZ(20deg)',
        }}
      >
        {columns.map((columnItems, index) => (
          <Marquee
            key={index}
            pauseOnHover={pauseOnHover}
            vertical
            className="[--duration:20s]"
            reverse={index % 2 === 1}
          >
            {columnItems}
          </Marquee>
        ))}
      </div>
    </div>
  );
}
