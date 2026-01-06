import React, { ReactNode, memo, useEffect, useRef, useState } from 'react';
import './index.less';
import { getRandomNumberByRange, square, sum } from './tool';

interface VertifyType {
  spliced: boolean;
  verified: boolean;
  left: number;
  destX: number;
}

interface IVertifyProp {
  width?: number;
  height?: number;
  l?: number;
  r?: number;
  visible?: boolean;
  text?: string | ReactNode;
  refreshIcon?: string;
  imgUrl?: string;
  onDraw?: (l: number) => void;
  onCustomVertify?: (arg: VertifyType) => VertifyType;
  onSuccess?: VoidFunction;
  onFail?: VoidFunction;
  onRefresh?: VoidFunction;

  /**
   * @description 图片开始加载时的回调
   * @default () => {}
   */
  onImgLoadStart?: VoidFunction;

  /**
   * @description 图片加载成功的回调
   * @default () => {}
   */
  onImgLoadSuccess?: VoidFunction;

  /**
   * @description 图片加载失败的回调（每次失败都会触发，包括重试）
   * @default () => {}
   */
  onImgLoadError?: VoidFunction;
}

export default memo(
  ({
    width = 320,
    height = 160,
    l = 42,
    r = 9,
    imgUrl,
    text = '向右滑动填充拼图',
    refreshIcon = 'http://cdn.dooring.cn/dr/icon12.png',
    visible = true,
    onDraw,
    onCustomVertify,
    onSuccess,
    onFail,
    onRefresh,
    onImgLoadStart,
    onImgLoadSuccess,
    onImgLoadError,
  }: IVertifyProp) => {
    const [isLoading, setLoading] = useState(false);
    const [sliderLeft, setSliderLeft] = useState(0);
    const [sliderClass, setSliderClass] = useState('sliderContainer');
    const [textTip, setTextTip] = useState(text);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const blockRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const isMouseDownRef = useRef<boolean>(false);
    const trailRef = useRef<number[]>([]);
    const originXRef = useRef<number>(0);
    const originYRef = useRef<number>(0);
    const xRef = useRef<number>(0);
    const yRef = useRef<number>(0);
    const PI = Math.PI;
    const L = l + r * 2 + 3;

    const drawPath = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      operation: 'fill' | 'clip'
    ) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x + l / 2, y - r + 2, r, 0.72 * PI, 2.26 * PI);
      ctx.lineTo(x + l, y);
      ctx.arc(x + l + r - 2, y + l / 2, r, 1.21 * PI, 2.78 * PI);
      ctx.lineTo(x + l, y + l);
      ctx.lineTo(x, y + l);
      ctx.arc(x + r - 2, y + l / 2, r + 0.4, 2.76 * PI, 1.24 * PI, true);
      ctx.lineTo(x, y);
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.stroke();
      ctx.globalCompositeOperation = 'destination-over';
      if (operation === 'fill') {
        ctx.fill();
      } else {
        ctx.clip();
      }
    };

    const getRandomImgSrc = () => {
      return (
        imgUrl ||
        `https://picsum.photos/id/${getRandomNumberByRange(
          0,
          1084
        )}/${width}/${height}`
      );
    };

    const createImg = (onload: VoidFunction) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        typeof onImgLoadSuccess === 'function' && onImgLoadSuccess();
        onload();
      };

      img.onerror = () => {
        typeof onImgLoadError === 'function' && onImgLoadError();
        // 重试加载
        (img as any).setSrc(getRandomImgSrc());
      };

      (img as any).setSrc = (src: string) => {
        const isIE = window.navigator.userAgent.indexOf('Trident') > -1;
        if (isIE) {
          const xhr = new XMLHttpRequest();
          xhr.onloadend = function (e: any) {
            const file = new FileReader();
            file.readAsDataURL(e.target.response);
            file.onloadend = function (e) {
              img.src = e?.target?.result as string;
            };
          };
          xhr.open('GET', src);
          xhr.responseType = 'blob';
          xhr.send();
        } else {
          img.src = src;
        }
      };

      return img;
    };

    const draw = (img: HTMLImageElement) => {
      const canvasCtx = canvasRef.current?.getContext('2d');
      const blockCtx = blockRef.current?.getContext('2d');
      if (!canvasCtx || !blockCtx) return;

      xRef.current = getRandomNumberByRange(L + 10, width - (L + 10));
      yRef.current = getRandomNumberByRange(10 + r * 2, height - (L + 10));

      drawPath(canvasCtx, xRef.current, yRef.current, 'fill');
      drawPath(blockCtx, xRef.current, yRef.current, 'clip');

      canvasCtx.drawImage(img, 0, 0, width, height);
      blockCtx.drawImage(img, 0, 0, width, height);

      const y1 = yRef.current - r * 2 - 1;
      const imageData = blockCtx.getImageData(xRef.current - 3, y1, L, L);
      blockRef.current.width = L;
      blockCtx.putImageData(imageData, 0, y1);
    };

    const initImg = () => {
      typeof onImgLoadStart === 'function' && onImgLoadStart();
      setLoading(true);
      const img = createImg(() => {
        setLoading(false);
        draw(img);
      });
      imgRef.current = img;
    };

    const reset = () => {
      const canvasCtx = canvasRef.current?.getContext('2d');
      const blockCtx = blockRef.current?.getContext('2d');
      if (!canvasCtx || !blockCtx) return;

      setSliderLeft(0);
      setSliderClass('sliderContainer');
      setTextTip(text);
      blockRef.current.width = width;
      blockRef.current.style.left = '0px';

      canvasCtx.clearRect(0, 0, width, height);
      blockCtx.clearRect(0, 0, width, height);

      // 触发加载开始
      typeof onImgLoadStart === 'function' && onImgLoadStart();
      setLoading(true);
      imgRef.current?.setSrc?.(getRandomImgSrc());
    };

    const handleRefresh = () => {
      reset();
      typeof onRefresh === 'function' && onRefresh();
    };

    const verify = () => {
      const arr = trailRef.current;
      const average = arr.length ? arr.reduce(sum) / arr.length : 0;
      const deviations = arr.map((x) => x - average);
      const stddev = arr.length
        ? Math.sqrt(deviations.map(square).reduce(sum) / arr.length)
        : 0;
      const left = parseInt(blockRef.current.style.left || '0', 10);
      return {
        spliced: Math.abs(left - xRef.current) < 10,
        verified: stddev !== 0,
        left,
        destX: xRef.current,
      };
    };

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      originXRef.current = clientX;
      originYRef.current = clientY;
      isMouseDownRef.current = true;
    };

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isMouseDownRef.current) return;
      e.preventDefault();
      const eventX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const eventY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const moveX = eventX - originXRef.current;
      const moveY = eventY - originYRef.current;

      if (moveX < 0 || moveX + 38 >= width) return;

      setSliderLeft(moveX);
      const blockLeft = ((width - 40 - 20) / (width - 40)) * moveX;
      blockRef.current.style.left = blockLeft + 'px';
      setSliderClass('sliderContainer sliderContainer_active');
      trailRef.current.push(moveY);
      onDraw?.(blockLeft);
    };

    const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isMouseDownRef.current) return;
      isMouseDownRef.current = false;
      const eventX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
      if (eventX === originXRef.current) return;

      setSliderClass('sliderContainer');
      const result = onCustomVertify ? onCustomVertify(verify()) : verify();

      if (result.spliced) {
        if (result.verified) {
          setSliderClass('sliderContainer sliderContainer_success');
          onSuccess?.();
        } else {
          setSliderClass('sliderContainer sliderContainer_fail');
          setTextTip('请再试一次');
          reset();
        }
      } else {
        setSliderClass('sliderContainer sliderContainer_fail');
        onFail?.();
        setTimeout(reset, 1000);
      }
    };

    useEffect(() => {
      if (visible) {
        if (imgRef.current) {
          reset();
        } else {
          initImg();
        }
      }
    }, [visible]);

    return (
      <div
        className="vertifyWrap"
        style={{
          width: `${width}px`,
          margin: '0 auto',
          display: visible ? 'block' : 'none',
        }}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        <div className="canvasArea">
          <canvas ref={canvasRef} width={width} height={height} />
          <canvas
            ref={blockRef}
            className="block"
            width={width}
            height={height}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          />
        </div>
        <div
          className={sliderClass}
          style={{
            pointerEvents: isLoading ? 'none' : 'auto',
            width: `${width}px`,
          }}
        >
          <div className="sliderMask" style={{ width: `${sliderLeft}px` }}>
            <div
              className="slider"
              style={{ left: `${sliderLeft}px` }}
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              <div className="sliderIcon">&rarr;</div>
            </div>
          </div>
          <div className="sliderText">{textTip}</div>
        </div>
        <div
          className="refreshIcon"
          onClick={handleRefresh}
          style={{ backgroundImage: `url(${refreshIcon})` }}
        />
        <div
          className="loadingContainer"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            display: isLoading ? 'flex' : 'none',
          }}
        >
          <div className="loadingIcon" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }
);
