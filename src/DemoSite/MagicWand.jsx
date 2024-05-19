/* eslint-disable no-unused-expressions */
/* eslint-disable no-unused-vars */
"use client"
import { magicWand } from "./magicWand"
import React, { useEffect, useRef, useState } from "react"

export function MagicWand({ image }) {
  const [colorThreshold, setColorThreshold] = useState(15)
  const [simplifyTolerant, setSimplifyTolerant] = useState(0)
  const [simplifyCount, setSimplifyCount] = useState(30)
  const [hatchLength, setHatchLength] = useState(4)
  const blurRadius = useRef(5)
  const currentThreshold = useRef(colorThreshold)
  const imageInfo = useRef(null)
  const hatchOffset = useRef(0)
  const mask = useRef(null)
  const oldMask = useRef(null)
  const downPoint = useRef()

  const [savedParts, setSavedParts] = useState([])

  const allowDraw = useRef(false)
  const addMode = useRef(false)
  const cacheInd = useRef(null)

  const canvasRef = useRef(null)
  const imgRef = useRef(null)

  function onRadiusChange(e) {
    blurRadius.current = e.target.value
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  function initImage() {
    // const img = imgRef.current
    // if (!img) return
    // img.setAttribute("src", image)
    // img.onload = function () {
    //   initCanvas(img)
    // }
  }

  function initCanvas(img) {
    var cvs = canvasRef.current
    if (!cvs) return
    const w = img.style.width.replace("px", "")
    const h = img.style.height.replace("px", "")
    // cvs.width = w
    // cvs.height = h

    const imgInfo = {
      width: Math.round(Number(w)),
      height: Math.round(Number(h)),
      context: cvs.getContext("2d"),
    }

    mask.current = null

    const tempCtx = document.createElement("canvas").getContext("2d")
    if (!tempCtx) return
    tempCtx.canvas.width = imgInfo.width
    tempCtx.canvas.height = imgInfo.height
    tempCtx.drawImage(img, 0, 0)

    imgInfo.data = tempCtx.getImageData(0, 0, imgInfo.width, imgInfo.height)

    console.log({ tempCtx, imgInfo, img })
    imageInfo.current = imgInfo
  }

  function getOffset(element) {
    if (!element.getClientRects().length) {
      return { top: 0, left: 0 }
    }

    let rect = element.getBoundingClientRect()
    let win = element.ownerDocument.defaultView
    return {
      top: rect.top + win.pageYOffset,
      left: rect.left + win.pageXOffset,
    }
  }

  function getMousePosition(e) {
    const p = getOffset(e.target),
      x = Math.round((e.clientX || e.pageX) - p.left),
      y = Math.round((e.clientY || e.pageY) - p.top)
    return { x: x, y: y }
  }

  function onMouseDown(e) {
    console.log("onMouseDown", e)
    if (e.button == 0) {
      allowDraw.current = true
      addMode.current = e.ctrlKey
      const dp = getMousePosition(e)
      downPoint.current = dp
      drawMask(dp.x, dp.y)
    } else {
      allowDraw.current = false
      addMode.current = false
      oldMask.current = null
    }
  }

  function onMouseMove(e) {
    if (allowDraw.current) {
      var p = getMousePosition(e)

      if (p.x != downPoint.current.x || p.y != downPoint.current.y) {
        var dx = p.x - downPoint.current.x,
          dy = p.y - downPoint.current.y,
          len = Math.sqrt(dx * dx + dy * dy),
          adx = Math.abs(dx),
          ady = Math.abs(dy),
          sign = adx > ady ? dx / adx : dy / ady
        sign = sign < 0 ? sign / 5 : sign / 3
        var thres = Math.min(
          Math.max(colorThreshold + Math.floor(sign * len), 1),
          255
        )
        //var thres = Math.min(colorThreshold + Math.floor(len / 3), 255);
        if (thres != currentThreshold.current) {
          currentThreshold.current = thres
          drawMask(downPoint.current.x, downPoint.current.y)
        }
      }
    }
  }

  function onMouseUp(e) {
    allowDraw.current = false
    addMode.current = false
    oldMask.current = null
    currentThreshold.current = colorThreshold
  }

  function onKeyDown(e) {
    if (e.keyCode == 17) {
      canvasRef.current.classList.add("add-mode")
    }
  }

  function onKeyUp(e) {
    if (e.keyCode == 17) {
      canvasRef.current.classList.remove("add-mode")
    }
  }

  function showThreshold() {
    document.getElementById("threshold").innerHTML =
      "Threshold: " + currentThreshold.current
  }

  function drawMask(x, y) {
    if (!imageInfo.current) return

    showThreshold()

    const image = {
      data: imageInfo.current.data.data,
      width: imageInfo.current.width,
      height: imageInfo.current.height,
      bytes: 4,
    }

    if (addMode.current && !oldMask.current) {
      oldMask.current = mask.current
    }

    let old = oldMask.current ? oldMask.current.data : null

    // @ts-ignore
    mask.current = magicWand.floodFill(
      image,
      x,
      y,
      currentThreshold.current,
      old,
      true
    )

    if (mask.current) {
      // @ts-ignore
      mask.current = magicWand.gaussBlurOnlyBorder(
        mask.current,
        blurRadius.current,
        old
      )
    }

    if (addMode.current && oldMask.current) {
      mask.current = mask.current
        ? concatMasks(mask.current, oldMask.current)
        : oldMask.current
    }

    drawBorder(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  function hatchTick() {
    hatchOffset.current = (hatchOffset.current + 1) % (hatchLength * 2)
    drawBorder(true)
  }

  function drawBorder(noBorder) {
    if (!mask.current) return

    var x,
      y,
      i,
      j,
      k,
      w = imageInfo.current.width,
      h = imageInfo.current.height,
      ctx = imageInfo.current.context,
      imgData = ctx.createImageData(w, h),
      res = imgData.data

    // @ts-ignore
    if (!noBorder) cacheInd.current = magicWand.getBorderIndices(mask.current)

    ctx.clearRect(0, 0, w, h)

    var len = cacheInd.current.length || 0
    for (j = 0; j < len; j++) {
      i = cacheInd.current[j]
      x = i % w // calc x by index
      y = (i - x) / w // calc y by index
      k = (y * w + x) * 4
      if ((x + y + hatchOffset) % (hatchLength * 2) < hatchLength) {
        // detect hatch color
        res[k + 3] = 255 // black, change only alpha
      } else {
        res[k] = 255 // white
        res[k + 1] = 255
        res[k + 2] = 255
        res[k + 3] = 255
      }
    }

    ctx.putImageData(imgData, 0, 0)
  }
  function trace() {
    //@ts-ignore
    var cs = magicWand.traceContours(mask.current)
    //@ts-ignore
    cs = magicWand.simplifyContours(cs, simplifyTolerant, simplifyCount)
    console.log(cs, mask.current)

    mask.current = null

    // draw contours
    var ctx = imageInfo.current.context
    ctx.clearRect(0, 0, imageInfo.current.width, imageInfo.current.height)
    //inner
    ctx.beginPath()
    let pathways = {
      inner: [],
      outer: [],
    }
    for (var i = 0; i < cs.length; i++) {
      if (!cs[i].inner) continue
      var ps = cs[i].points
      ctx.moveTo(ps[0].x, ps[0].y)
      for (var j = 1; j < ps.length; j++) {
        pathways.inner.push([ps[j].x, ps[j].y])
        ctx.lineTo(ps[j].x, ps[j].y)
      }
    }
    ctx.strokeStyle = "red"
    ctx.lineWidth = 10
    ctx.fillStyle = "gray"
    ctx.stroke()
    //outer
    ctx.beginPath()
    for (var i = 0; i < cs.length; i++) {
      if (cs[i].inner) continue
      var ps = cs[i].points
      ctx.moveTo(ps[0].x, ps[0].y)
      for (var j = 1; j < ps.length; j++) {
        pathways.outer.push([ps[j].x, ps[j].y])
        ctx.lineTo(ps[j].x, ps[j].y)
      }
    }
    ctx.strokeStyle = "blue"
    ctx.stroke()
  }

  function paint(color, alpha) {
    if (!mask.current) return

    var rgba = hexToRgb(color, alpha)

    let x,
      y,
      data = mask.current.data,
      bounds = mask.current.bounds,
      maskW = mask.current.width,
      w = imageInfo.current.width,
      h = imageInfo.current.height,
      ctx = imageInfo.current.context,
      imgData = ctx.createImageData(w, h),
      res = imgData.data

    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        if (data[y * maskW + x] == 0) continue
        const k = (y * w + x) * 4
        res[k] = rgba[0]
        res[k + 1] = rgba[1]
        res[k + 2] = rgba[2]
        res[k + 3] = rgba[3]
      }
    }

    mask.current = null
    ctx.putImageData(imgData, 0, 0)
    setSavedParts((saved) => [...saved, imgData])
  }
  function hexToRgb(hex, alpha) {
    var int = parseInt(hex, 16)
    var r = (int >> 16) & 255
    var g = (int >> 8) & 255
    var b = int & 255

    return [r, g, b, Math.round(alpha * 255)]
  }
  function concatMasks(mask, old) {
    let data1 = old.data,
      data2 = mask.data,
      w1 = old.width,
      w2 = mask.width,
      b1 = old.bounds,
      b2 = mask.bounds,
      b = {
        // bounds for new mask
        minX: Math.min(b1.minX, b2.minX),
        minY: Math.min(b1.minY, b2.minY),
        maxX: Math.max(b1.maxX, b2.maxX),
        maxY: Math.max(b1.maxY, b2.maxY),
      },
      w = old.width, // size for new mask
      h = old.height,
      i,
      j,
      k,
      k1,
      k2,
      len

    let result = new Uint8Array(w * h)

    // copy all old mask
    len = b1.maxX - b1.minX + 1
    i = b1.minY * w + b1.minX
    k1 = b1.minY * w1 + b1.minX
    k2 = b1.maxY * w1 + b1.minX + 1
    // walk through rows (Y)
    for (k = k1; k < k2; k += w1) {
      result.set(data1.subarray(k, k + len), i) // copy row
      i += w
    }

    // copy new mask (only "black" pixels)
    len = b2.maxX - b2.minX + 1
    i = b2.minY * w + b2.minX
    k1 = b2.minY * w2 + b2.minX
    k2 = b2.maxY * w2 + b2.minX + 1
    // walk through rows (Y)
    for (k = k1; k < k2; k += w2) {
      // walk through cols (X)
      for (j = 0; j < len; j++) {
        if (data2[k + j] === 1) result[i + j] = 1
      }
      i += w
    }

    return {
      data: result,
      width: w,
      height: h,
      bounds: b,
    }
  }

  const handleFill = () => {
    trace()
    // paint("#dfdfdf", 0.5);
  }

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("keyup", onKeyUp)

    showThreshold()
    //@ts-ignore
    document.getElementById("blurRadius").value = blurRadius.current

    setInterval(function () {
      hatchTick()
    }, 300)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("keyup", onKeyUp)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hatchTick])

  useEffect(() => {
    console.log("refreshing canvas")
    setTimeout(function () {
      const canvas = document.getElementById("magicWandCanvas")
      console.log({ canvas })
      if (!canvas) return
      canvasRef.current = canvas
      const img = document.getElementsByTagName("img").item(0)
      imgRef.current = img

      initCanvas(img)
      canvasRef.current.addEventListener("mousedown", onMouseDown)
      canvasRef.current.addEventListener("mouseup", onMouseUp)
      canvasRef.current.addEventListener("mousemove", onMouseMove)
    }, 2000)

    return () => {
      canvasRef.current?.removeEventListener("mousedown", onMouseDown)
      canvasRef.current?.removeEventListener("mouseup", onMouseUp)
      canvasRef.current?.removeEventListener("mousemove", onMouseMove)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image])

  return (
    <div>
      <style jsx>
        {`
          .wrapper {
            top: 80px;
            width: 100vw;
            height: 100vh;
            overflow: auto;
          }
          .content {
            position: relative;
          }
          .canvas {
            position: absolute;
          }
          .canvas:hover {
            cursor: default;
          }
          .picture {
            position: absolute;
          }
          .button {
            padding: 4px;
            margin: 4px;
            border: 1px solid black;
            float: left;
          }
          .button:hover {
            background-color: blue;
            color: white;
            cursor: pointer;
          }
          #threshold {
            width: 95px;
            float: left;
          }
          #file-upload {
            display: none;
          }
          .add-mode {
            cursor: copy !important;
          }
        `}
      </style>
      <div style={{ overflow: "auto" }}>
        <div style={{ float: "left" }}>Blur radius: </div>
        <input
          id="blurRadius"
          type="text"
          onChange={onRadiusChange}
          style={{ float: "left", width: "50px", marginRight: "10px" }}
        />
        <button onClick={handleFill}>Fill the space</button>
        <div id="threshold"></div>
      </div>
    </div>
  )
}
