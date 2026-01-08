import { useState, useEffect, useRef } from "react";
import { useScrollParent } from "./utils/useScrollParent";

import { useUnmountedRef } from "./utils/useUnmountedRef";
import { useUpdateEffect } from "./utils/useUpdateEffect";
import { useDrag } from "./utils/useDrag";
import { getScrollTop } from "./utils/getScrollTop";
import type { PullStatus, LoadStatus, PullToRefreshifyProps } from "./types";
import { Events } from "./utils/events";

export const PullToRefreshify = ({
  className,
  styles,
  style,
  animationDuration = 300,
  completeDelay = 500,
  refreshing = false,
  headHeight = 50,
  startDistance = 30,
  resistance = 0.6,
  threshold = headHeight,
  onRefresh,
  disabled = false,
  prefixCls = "pull-to-refreshify",
  renderText,
  children,
  enableLoadMore = false,
  loadingMore = false,
  onLoadMore,
  loadMoreThreshold = 50,
  loadMoreDisabled = false,
  renderLoadMore,
}: PullToRefreshifyProps) => {
  const [pullRef, scrollParentRef] = useScrollParent();
  const unmountedRef = useUnmountedRef();
  const [[offsetY, duration, status], setState] = useState<
    [number, number, PullStatus]
  >(
    refreshing
      ? [headHeight, animationDuration, "refreshing"]
      : [0, 0, "normal"]
  );
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("normal");
  const loadingMoreRef = useRef(false);

  const dispatch = (status: PullStatus, dragOffsetY = 0) => {
    switch (status) {
      case "pulling":
      case "canRelease":
        setState([dragOffsetY, 0, status]);
        break;

      case "refreshing":
        setState([headHeight, animationDuration, status]);
        break;

      case "complete":
        setState([headHeight, animationDuration, status]);
        if (unmountedRef.current) return;
        setTimeout(() => {
          dispatch("normal");
        }, completeDelay);
        break;

      default:
        setState([0, animationDuration, status]);
    }
  };

  // Skip the first render
  useUpdateEffect(() => {
    dispatch(refreshing ? "refreshing" : "complete");
  }, [refreshing]);

  // Handle load more status change
  useUpdateEffect(() => {
    if (loadingMore) {
      setLoadStatus("loading");
      loadingMoreRef.current = true;
    } else if (loadStatus === "loading") {
      setLoadStatus("complete");
      loadingMoreRef.current = false;
      // Reset to normal after a delay
      setTimeout(() => {
        if (!unmountedRef.current) {
          setLoadStatus("normal");
        }
      }, completeDelay);
    }
  }, [loadingMore]);

  // Handle scroll to bottom load more
  useEffect(() => {
    if (!enableLoadMore || !onLoadMore || loadMoreDisabled) {
      return;
    }

    let scrollParent: Element | Window | undefined;
    let cleanupFn: (() => void) | undefined;

    // Wait for scroll parent to be ready
    const timer = setTimeout(() => {
      scrollParent = scrollParentRef.current;
      if (!scrollParent) {
        return;
      }

      const getScrollHeight = (ele: Element | Window): number => {
        if (ele === window) {
          return Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight
          );
        }
        return (ele as Element).scrollHeight;
      };

      const getClientHeight = (ele: Element | Window): number => {
        if (ele === window) {
          return window.innerHeight;
        }
        return (ele as Element).clientHeight;
      };

      const checkScrollToBottom = () => {
        if (
          loadingMoreRef.current ||
          loadStatus === "loading" ||
          loadStatus === "noMore" ||
          unmountedRef.current ||
          !scrollParent
        ) {
          return;
        }

        const scrollTop = getScrollTop(scrollParent);
        const scrollHeight = getScrollHeight(scrollParent);
        const clientHeight = getClientHeight(scrollParent);
        const distanceToBottom = scrollHeight - scrollTop - clientHeight;

        if (distanceToBottom <= loadMoreThreshold) {
          loadingMoreRef.current = true;
          setLoadStatus("loading");
          onLoadMore();
        }
      };

      const handleScroll = () => {
        checkScrollToBottom();
      };

      Events.on(scrollParent, "scroll", handleScroll, { passive: true });
      // Also check on initial render
      checkScrollToBottom();

      // Store cleanup function
      cleanupFn = () => {
        Events.off(scrollParent!, "scroll", handleScroll);
      };
    }, 0);

    return () => {
      clearTimeout(timer);
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [
    enableLoadMore,
    onLoadMore,
    loadMoreDisabled,
    loadMoreThreshold,
    loadStatus,
  ]);

  // Handle darg events
  const dragRef = useDrag({
    onDragMove: (event, { offsetY: dragOffsetY }) => {
      if (
        // Not set onRefresh event
        !onRefresh ||
        // Pull up
        dragOffsetY <= 0 ||
        // Not scrolled to top
        (dragOffsetY > 0 && getScrollTop(scrollParentRef.current) > 0) ||
        // Refreshing state has been triggered
        ["refreshing", "complete"].includes(status) ||
        disabled
      ) {
        return false;
      }

      // Solve the bug that the low-end Android system only triggers the touchmove event once
      if (!Events.isSupportsPassive()) {
        event.preventDefault();
      }

      const ratio = dragOffsetY / window.screen.height;
      const offset = dragOffsetY * (1 - ratio) * resistance;

      // Determine whether the condition for releasing immediate refresh is met
      const action =
        offset - startDistance < threshold ? "pulling" : "canRelease";

      dispatch(action, offset);
      return true;
    },
    onDragEnd: (_, { offsetY: dragOffsetY }) => {
      // No drag offset
      if (!dragOffsetY) {
        return;
      }

      // When the current state is the pulling state
      if (status === "pulling") {
        dispatch("normal");
        return;
      }

      // Execute the callback that triggers the refresh externally
      if (typeof onRefresh === "function") {
        onRefresh();
      }
    },
  });

  let percent = 0;
  if (offsetY >= startDistance) {
    percent =
      ((offsetY - startDistance < threshold
        ? offsetY - startDistance
        : threshold) *
        100) /
      threshold;
  }

  return (
    <div
      ref={dragRef}
      className={className ? `${prefixCls} ${className}` : prefixCls}
      style={{
        minHeight: headHeight,
        overflowY: "hidden",
        touchAction: "pan-y",
        ...styles?.container,
        ...style,
      }}
    >
      <div
        ref={pullRef}
        className={`${prefixCls}__content`}
        style={{
          willChange: "transform",
          WebkitTransition: `all ${duration}ms`,
          transition: `all ${duration}ms`,
          WebkitTransform: `translate3d(0, ${offsetY}px, 0)`,
          transform: `translate3d(0, ${offsetY}px, 0)`,
          ...styles?.content,
        }}
      >
        <div
          key={offsetY.toFixed(0)}
          className={`${prefixCls}__refresh`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#909090",
            fontSize: "14px",
            marginTop: -headHeight,
            height: headHeight,
            ...styles?.refresh,
          }}
        >
          {renderText(status, percent)}
        </div>
        <div className={`${prefixCls}__body`} style={styles?.body}>
          {children}
        </div>
        {enableLoadMore && (
          <div
            className={`${prefixCls}__load-more`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#909090",
              fontSize: "14px",
              ...styles?.loadMore,
            }}
          >
            {renderLoadMore
              ? renderLoadMore(loadStatus)
              : loadStatus === "loading"
              ? "加载中..."
              : loadStatus === "complete"
              ? "加载完成"
              : loadStatus === "noMore"
              ? "没有更多了"
              : ""}
          </div>
        )}
      </div>
    </div>
  );
};
