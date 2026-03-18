

import React from "react";
import { cn } from "../../../utils/cn";


export interface SkeletonProps {
  
  width?: string | number;
  
  height?: string | number;
  
  borderRadius?: string | number;
  
  shimmer?: boolean;
  
  className?: string;
  
  rows?: number;
  
  rowGap?: number;
  
  size?: number;
}



export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 16,
  borderRadius = 4,
  shimmer = true,
  className,
}) => {
  const style: React.CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius:
      typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
  };

  return (
    <div
      className={cn("bg-bg-tertiary", shimmer && "skeleton-shimmer", className)}
      style={style}
    />
  );
};



export const SkeletonText: React.FC<
  Omit<SkeletonProps, "height"> & { lines?: number }
> = ({ lines = 3, width = "100%", shimmer = true, className, rowGap = 8 }) => {
  return (
    <div className={cn("flex flex-col", className)} style={{ gap: rowGap }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? "60%" : width}
          height={16}
          borderRadius={4}
          shimmer={shimmer}
        />
      ))}
    </div>
  );
};


export const SkeletonAvatar: React.FC<SkeletonProps> = ({
  size = 40,
  shimmer = true,
  className,
}) => {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius="50%"
      shimmer={shimmer}
      className={className}
    />
  );
};


export const SkeletonCard: React.FC<SkeletonProps> = ({
  shimmer = true,
  className,
}) => {
  return (
    <div
      className={cn(
        "p-4 bg-bg-secondary rounded-lg border border-border",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <SkeletonAvatar size={48} shimmer={shimmer} />
        <div className="flex-1 min-w-0">
          <Skeleton
            width="40%"
            height={20}
            borderRadius={4}
            shimmer={shimmer}
            className="mb-2"
          />
          <SkeletonText lines={2} shimmer={shimmer} />
        </div>
      </div>
    </div>
  );
};


export const SkeletonMessage: React.FC<{
  isSelf?: boolean;
  shimmer?: boolean;
}> = ({ isSelf = false, shimmer = true }) => {
  return (
    <div className={cn("flex gap-3", isSelf ? "flex-row-reverse" : "flex-row")}>
      <SkeletonAvatar size={36} shimmer={shimmer} />
      <div
        className={cn(
          "flex flex-col max-w-[70%]",
          isSelf ? "items-end" : "items-start",
        )}
      >
        <Skeleton
          width={60}
          height={14}
          borderRadius={4}
          shimmer={shimmer}
          className="mb-1"
        />
        <div
          className={cn(
            "px-4 py-2 rounded-2xl",
            isSelf
              ? "bg-primary rounded-br-sm"
              : "bg-bg-tertiary rounded-bl-sm",
          )}
        >
          <Skeleton
            width={200}
            height={16}
            borderRadius={4}
            shimmer={shimmer}
          />
        </div>
      </div>
    </div>
  );
};


export const SkeletonListItem: React.FC<{ shimmer?: boolean }> = ({
  shimmer = true,
}) => {
  return (
    <div className="flex items-center gap-3 p-3">
      <SkeletonAvatar size={40} shimmer={shimmer} />
      <div className="flex-1 min-w-0">
        <Skeleton
          width="50%"
          height={16}
          borderRadius={4}
          shimmer={shimmer}
          className="mb-2"
        />
        <Skeleton width="80%" height={12} borderRadius={4} shimmer={shimmer} />
      </div>
      <Skeleton width={40} height={12} borderRadius={4} shimmer={shimmer} />
    </div>
  );
};


export const SkeletonChatList: React.FC<{ count?: number }> = ({
  count = 8,
}) => {
  return (
    <div className="flex flex-col">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonListItem key={index} />
      ))}
    </div>
  );
};


export const SkeletonMessageList: React.FC<{ count?: number }> = ({
  count = 6,
}) => {
  return (
    <div className="flex flex-col gap-4 p-4">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonMessage key={index} isSelf={index % 3 === 1} />
      ))}
    </div>
  );
};

export default Skeleton;

