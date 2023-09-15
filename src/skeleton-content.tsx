import React, { Children, memo, useEffect } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import {
  AnimationDirection,
  AnimationType,
  DEFAULT_ANIMATION_DIRECTION,
  DEFAULT_ANIMATION_TYPE,
  DEFAULT_BONE_COLOR,
  DEFAULT_BORDER_RADIUS,
  DEFAULT_DURATION,
  DEFAULT_EASING,
  DEFAULT_HIGHLIGHT_COLOR,
  DEFAULT_LOADING,
  ICustomViewStyle,
  IDirection,
  ISkeletonContentProps
} from './constants';

const { useState, useCallback } = React;

const styles = StyleSheet.create({
  absoluteGradient: {
    height: '100%',
    position: 'absolute',
    width: '100%'
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  gradientChild: {
    flex: 1
  }
});

const useLayout = () => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  return [size, onLayout] as const;
};

const getGradientEndDirection = (
  animationDirection: AnimationDirection,
  animationType: AnimationType,
  boneWidth: number,
  boneHeight: number
): IDirection => {
  let direction = { x: 0, y: 0 };
  if (animationType === 'shiver') {
    if (
      animationDirection === 'horizontalLeft' ||
      animationDirection === 'horizontalRight'
    ) {
      direction = { x: 1, y: 0 };
    } else if (
      animationDirection === 'verticalTop' ||
      animationDirection === 'verticalDown'
    ) {
      direction = { x: 0, y: 1 };
    } else if (
      animationDirection === 'diagonalTopRight' ||
      animationDirection === 'diagonalDownRight' ||
      animationDirection === 'diagonalDownLeft' ||
      animationDirection === 'diagonalTopLeft'
    ) {
      if (boneWidth && boneHeight && boneWidth > boneHeight)
        return { x: 0, y: 1 };
      return { x: 1, y: 0 };
    }
  }
  return direction;
};

const getGradientSize = (
  animationDirection: AnimationDirection,
  boneWidth: number,
  boneHeight: number
): ICustomViewStyle => {
  const gradientStyle: ICustomViewStyle = {};
  if (
    animationDirection === 'diagonalDownRight' ||
    animationDirection === 'diagonalDownLeft' ||
    animationDirection === 'diagonalTopRight' ||
    animationDirection === 'diagonalTopLeft'
  ) {
    gradientStyle.width = boneWidth;
    gradientStyle.height = boneHeight;
    if (boneHeight >= boneWidth) gradientStyle.height *= 1.5;
    else gradientStyle.width *= 1.5;
  }
  return gradientStyle;
};

const getBoneStyles = (
  boneLayout: ICustomViewStyle,
  boneColor: string,
  animationDirection: AnimationDirection,
  animationType: AnimationType,
  boneWidth: number,
  boneHeight: number
): ICustomViewStyle => {
  const { backgroundColor, borderRadius } = boneLayout;
  const boneStyle: ICustomViewStyle = {
    width: boneWidth,
    height: boneHeight,
    borderRadius: borderRadius || DEFAULT_BORDER_RADIUS,
    ...boneLayout
  };
  if (animationType !== 'pulse') {
    boneStyle.overflow = 'hidden';
    boneStyle.backgroundColor = backgroundColor || boneColor;
  }
  if (
    animationDirection === 'diagonalDownRight' ||
    animationDirection === 'diagonalDownLeft' ||
    animationDirection === 'diagonalTopRight' ||
    animationDirection === 'diagonalTopLeft'
  ) {
    boneStyle.justifyContent = 'center';
    boneStyle.alignItems = 'center';
  }
  return boneStyle;
};
const ShiverBone = ({
  animationValue,
  animationDirection,
  animationType,
  boneColor,
  boneHeight,
  boneWidth,
  highlightColor,
  layoutStyle,
  positionRange
}: {
  animationValue: Animated.SharedValue<number>;
  animationDirection: AnimationDirection;
  animationType: AnimationType;
  boneColor: string;
  boneWidth: number;
  boneHeight: number;
  highlightColor: string;
  layoutStyle: ICustomViewStyle;
  positionRange: number[];
}): JSX.Element => {
  const animatedStyle = useAnimatedStyle(() => {
    if (
      animationDirection === 'verticalTop' ||
      animationDirection === 'verticalDown' ||
      animationDirection === 'horizontalLeft' ||
      animationDirection === 'horizontalRight'
    ) {
      const interpolatedPosition = interpolate(
        animationValue.value,
        [0, 1],
        positionRange
      );
      if (
        animationDirection === 'verticalTop' ||
        animationDirection === 'verticalDown'
      ) {
        return {
          transform: [{ translateY: interpolatedPosition }]
        };
      }
      return {
        transform: [{ translateX: interpolatedPosition }]
      };
    }

    if (
      animationDirection === 'diagonalDownRight' ||
      animationDirection === 'diagonalTopRight' ||
      animationDirection === 'diagonalDownLeft' ||
      animationDirection === 'diagonalTopLeft'
    ) {
      const diagonal = Math.sqrt(
        boneHeight * boneHeight + boneWidth * boneWidth
      );
      const mainDimension = Math.max(boneHeight, boneWidth);
      const oppositeDimension =
        mainDimension === boneWidth ? boneHeight : boneWidth;
      const diagonalAngle = Math.acos(mainDimension / diagonal);
      let rotateAngle =
        animationDirection === 'diagonalDownRight' ||
        animationDirection === 'diagonalTopLeft'
          ? Math.PI / 2 - diagonalAngle
          : Math.PI / 2 + diagonalAngle;
      const additionalRotate =
        animationDirection === 'diagonalDownRight' ||
        animationDirection === 'diagonalTopLeft'
          ? 2 * diagonalAngle
          : -2 * diagonalAngle;
      const distanceFactor = (diagonal + oppositeDimension) / 2;
      if (mainDimension === boneWidth && boneWidth !== boneHeight)
        rotateAngle += additionalRotate;
      const sinComponent = Math.sin(diagonalAngle) * distanceFactor;
      const cosComponent = Math.cos(diagonalAngle) * distanceFactor;
      let xOutputRange = [0, 0];
      let yOutputRange = [0, 0];
      if (
        animationDirection === 'diagonalDownRight' ||
        animationDirection === 'diagonalTopLeft'
      ) {
        xOutputRange =
          animationDirection === 'diagonalDownRight'
            ? [-sinComponent, sinComponent]
            : [sinComponent, -sinComponent];
        yOutputRange =
          animationDirection === 'diagonalDownRight'
            ? [-cosComponent, cosComponent]
            : [cosComponent, -cosComponent];
      } else {
        xOutputRange =
          animationDirection === 'diagonalDownLeft'
            ? [-sinComponent, sinComponent]
            : [sinComponent, -sinComponent];
        yOutputRange =
          animationDirection === 'diagonalDownLeft'
            ? [cosComponent, -cosComponent]
            : [-cosComponent, cosComponent];
        if (mainDimension === boneHeight && boneWidth !== boneHeight) {
          xOutputRange.reverse();
          yOutputRange.reverse();
        }
      }
      const translateX = interpolate(
        animationValue.value,
        [0, 1],
        xOutputRange
      );
      const translateY = interpolate(
        animationValue.value,
        [0, 1],
        yOutputRange
      );
      // swapping the translates if width is the main dim
      if (mainDimension === boneWidth) {
        return {
          transform: [{ translateX: translateY }, { translateY: translateX }]
        };
      }

      return {
        transform: [
          { translateX },
          { translateY },
          { rotate: `${rotateAngle}rad` }
        ]
      };
    }

    return {};
  });

  return (
    <View
      style={getBoneStyles(
        layoutStyle,
        boneColor,
        animationDirection,
        animationType,
        boneWidth,
        boneHeight
      )}
    >
      <Animated.View
        style={[
          styles.absoluteGradient,
          animatedStyle,
          getGradientSize(animationDirection, boneWidth, boneHeight)
        ]}
      >
        <LinearGradient
          colors={[boneColor!, highlightColor!, boneColor!]}
          start={{ x: 0, y: 0 }}
          end={getGradientEndDirection(
            animationDirection,
            animationType,
            boneWidth,
            boneHeight
          )}
          style={styles.gradientChild}
        />
      </Animated.View>
    </View>
  );
};

const StaticBone = ({
  animationValue,
  animationDirection,
  animationType,
  boneColor,
  boneHeight,
  boneWidth,
  highlightColor,
  layoutStyle
}: {
  animationValue: Animated.SharedValue<number>;
  animationDirection: AnimationDirection;
  animationType: AnimationType;
  boneColor: string;
  boneWidth: number;
  boneHeight: number;
  highlightColor: string;
  layoutStyle: ICustomViewStyle;
}): JSX.Element => {
  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      animationValue.value,
      [0, 1],
      [boneColor!, highlightColor!]
    );

    if (animationType === 'none') return {};

    return { backgroundColor };
  });

  return (
    <Animated.View
      key={layoutStyle.key}
      style={[
        animatedStyle,
        getBoneStyles(
          layoutStyle,
          boneColor,
          animationDirection,
          animationType,
          boneWidth,
          boneHeight
        )
      ]}
    />
  );
};

const SkeletonComponent: React.FunctionComponent<ISkeletonContentProps> = ({
  containerStyle = styles.container,
  easing = DEFAULT_EASING,
  duration = DEFAULT_DURATION,
  layout = [],
  animationType = DEFAULT_ANIMATION_TYPE,
  animationDirection = DEFAULT_ANIMATION_DIRECTION,
  isLoading = DEFAULT_LOADING,
  boneColor = DEFAULT_BONE_COLOR,
  highlightColor = DEFAULT_HIGHLIGHT_COLOR,
  children
}) => {
  const animationValue = useSharedValue(0);
  const loadingValue = useSharedValue(isLoading ? 1 : 0);
  const shiverValue = useSharedValue(animationType === 'shiver' ? 1 : 0);
  const [componentSize, onLayout] = useLayout();

  useEffect(() => {
    if (loadingValue.value === 1) {
      if (shiverValue.value === 1) {
        animationValue.value = withRepeat(
          withTiming(1, { duration, easing }),
          -1,
          false
        );
      } else {
        animationValue.value = withRepeat(
          withTiming(1, { duration: duration! / 2, easing }),
          -1,
          true
        );
      }
    }
  }, [loadingValue, shiverValue, animationValue, duration, easing]);

  const getBoneWidth = (boneLayout: ICustomViewStyle) =>
    (typeof boneLayout.width === 'string'
      ? componentSize.width
      : Number(boneLayout.width)) || 0;
  const getBoneHeight = (boneLayout: ICustomViewStyle) =>
    (typeof boneLayout.height === 'string'
      ? componentSize.height
      : Number(boneLayout.height)) || 0;

  const getPositionRange = (boneLayout: ICustomViewStyle): number[] => {
    const outputRange: number[] = [];
    // use layout dimensions for percentages (string type)
    const boneWidth = getBoneWidth(boneLayout);
    const boneHeight = getBoneHeight(boneLayout);

    if (animationDirection === 'horizontalRight') {
      outputRange.push(-boneWidth, +boneWidth);
    } else if (animationDirection === 'horizontalLeft') {
      outputRange.push(+boneWidth, -boneWidth);
    } else if (animationDirection === 'verticalDown') {
      outputRange.push(-boneHeight, +boneHeight);
    } else if (animationDirection === 'verticalTop') {
      outputRange.push(+boneHeight, -boneHeight);
    }
    return outputRange;
  };

  const getBoneContainer = (
    layoutStyle: ICustomViewStyle,
    childrenBones: JSX.Element[],
    key: number | string
  ) => (
    <View key={layoutStyle.key || key} style={layoutStyle}>
      {childrenBones}
    </View>
  );

  const getBones = (
    bonesLayout: ICustomViewStyle[] | undefined,
    childrenItems: any,
    prefix: string | number = ''
  ): JSX.Element[] => {
    if (bonesLayout && bonesLayout.length > 0) {
      const iterator: number[] = new Array(bonesLayout.length).fill(0);
      return iterator.map((_, i) => {
        // has a nested layout
        if (bonesLayout[i].children && bonesLayout[i].children!.length > 0) {
          const containerPrefix = bonesLayout[i].key || `bone_container_${i}`;
          const { children: childBones, ...layoutStyle } = bonesLayout[i];
          return getBoneContainer(
            layoutStyle,
            getBones(childBones, [], containerPrefix),
            containerPrefix
          );
        }
        if (animationType === 'pulse' || animationType === 'none') {
          return (
            <StaticBone
              key={prefix ? `${prefix}_${i}` : i}
              {...{
                animationDirection,
                animationType,
                animationValue,
                boneColor,
                boneHeight: getBoneHeight(bonesLayout[i]),
                boneWidth: getBoneWidth(bonesLayout[i]),
                highlightColor,
                layoutStyle: bonesLayout[i]
              }}
            />
          );
        }
        return (
          <ShiverBone
            key={prefix ? `${prefix}_${i}` : i}
            {...{
              animationDirection,
              animationType,
              animationValue,
              boneColor,
              boneHeight: getBoneHeight(bonesLayout[i]),
              boneWidth: getBoneWidth(bonesLayout[i]),
              highlightColor,
              layoutStyle: bonesLayout[i],
              positionRange: getPositionRange(bonesLayout[i])
            }}
          />
        );
      });
    }
    return Children.map(childrenItems, (child, i) => {
      const styling = child.props.style || {};
      if (animationType === 'pulse' || animationType === 'none') {
        return (
          <StaticBone
            key={prefix ? `${prefix}_${i}` : i}
            {...{
              animationDirection,
              animationType,
              animationValue,
              boneColor,
              boneHeight: getBoneHeight(styling),
              boneWidth: getBoneWidth(styling),
              highlightColor,
              layoutStyle: styling
            }}
          />
        );
      }

      return (
        <ShiverBone
          key={prefix ? `${prefix}_${i}` : i}
          {...{
            animationDirection,
            animationType,
            animationValue,
            boneColor,
            boneHeight: getBoneHeight(styling),
            boneWidth: getBoneWidth(styling),
            highlightColor,
            layoutStyle: styling,
            positionRange: getPositionRange(styling)
          }}
        />
      );
    });
  };

  return (
    <View style={containerStyle} onLayout={onLayout}>
      {isLoading ? getBones(layout, children) : children}
    </View>
  );
};

export const SkeletonContent = memo(SkeletonComponent);
