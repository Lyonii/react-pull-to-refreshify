import type { CSSProperties, ReactNode } from "react";

export type PullStatus =
  | "normal"
  | "pulling"
  | "canRelease"
  | "refreshing"
  | "complete";

export type LoadStatus =
  | "normal"
  | "loading"
  | "complete"
  | "noMore";

export interface PullToRefreshifyProps {
  className?: string;
  style?: CSSProperties;
  /**
   * Whether to display the refreshing status
   */
  refreshing?: boolean;
  // Handler function when refresh triggered
  onRefresh: () => void;
  /**
   * The time for the delay to disappear after completion, the unit is ms
   */
  completeDelay?: number;
  /**
   * The time for animation duration, the unit is ms
   */
  animationDuration?: number;
  /**
   * The height of the head prompt content area, the unit is px
   */
  headHeight?: number;
  /**
   * How far to start the pulling status, unit is px
   */
  startDistance?: number;
  /**
   * How far to pull down to trigger refresh, unit is px
   */
  threshold?: number;
  /**
   * Scale of difficulty to pull down
   */
  resistance?: number;
  /**
   * Whether the PullToRefresh is disabled
   */
  disabled?: boolean;
  /**
   * Customize the pulling content according to the pulling status
   */
  renderText: (status: PullStatus, percent: number) => React.ReactNode;
  /**
   * prefix class
   */
  prefixCls?: string;
  children?: ReactNode;
  /**
   * Whether to enable load more on scroll to bottom
   */
  enableLoadMore?: boolean;
  /**
   * Whether to display the loading more status
   */
  loadingMore?: boolean;
  /**
   * Handler function when load more triggered
   */
  onLoadMore?: () => void;
  /**
   * Distance from bottom to trigger load more, unit is px
   */
  loadMoreThreshold?: number;
  /**
   * Whether load more is disabled
   */
  loadMoreDisabled?: boolean;
  /**
   * Customize the loading more content according to the load status
   */
  renderLoadMore?: (status: LoadStatus) => React.ReactNode;
  styles?:{ [key in "body" | "container" | "content" | "loadMore" | "refresh"]?: React.CSSProperties}
}
