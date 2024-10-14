// The hand detection functionality in this project is based on the tutorial by Nicholas Renotte:
// Title: Real Time AI HAND POSE Estimation with Javascript, Tensorflow.JS and React.JS
// YouTube vide link: https://www.youtube.com/watch?v=f7uBsb-0sGQ&t=675s

import React, { useRef, useEffect, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as handpose from "@tensorflow-models/handpose";
import * as faceapi from "face-api.js";
import Webcam from "react-webcam";
import "./App.css";
import { drawHand } from "./utilities";
import Sketch from "react-p5";
import * as brush from "p5.brush";

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef(null);
  const drawingHistory = useRef([]);
  const frameCount = useRef(0);
  const positionBuffer = useRef([]);

  const handposeNet = useRef(null);
  const detections = useRef(null);
  const [handsloaded, setHandsloaded] = useState(false);
  const [color, setColor] = useState("#ffba59");

  const [faceDetections, setFaceDetections] = useState([]);

  useEffect(() => {
    runDetection();
    setupDrawingCanvas();
  }, []);

  const setupDrawingCanvas = () => {
    const drawingCanvas = drawingCanvasRef.current;
    const ctx = drawingCanvas.getContext("2d");
    ctx.strokeStyle = "blue"; // Default stroke color
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round"; // Smooth line joins
  };

  const runDetection = async () => {
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    await faceapi.nets.faceExpressionNet.loadFromUri("/models");

    console.log("Face API models loaded.");
  };

  const calculate3DDistance = (point1, point2) => {
    return Math.sqrt(
      Math.pow(point1[0] - point2[0], 2) +
        Math.pow(point1[1] - point2[1], 2) +
        Math.pow(point1[2] - point2[2], 2)
    );
  };

  const isHandFist = (landmarks) => {
    const palmBase = landmarks[0];

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const thumbDistance = calculate3DDistance(thumbTip, palmBase);
    const indexDistance = calculate3DDistance(indexTip, palmBase);
    const middleDistance = calculate3DDistance(middleTip, palmBase);
    const ringDistance = calculate3DDistance(ringTip, palmBase);
    const pinkyDistance = calculate3DDistance(pinkyTip, palmBase);

    const palmWidth = calculate3DDistance(landmarks[5], landmarks[17]);

    const avgFingerDistance =
      (thumbDistance +
        indexDistance +
        middleDistance +
        ringDistance +
        pinkyDistance) /
      5;

    const threshold = palmWidth * 1.2;

    console.log("threshold reached!"); // for testing

    return avgFingerDistance < threshold;
  };

  const smoothPosition = (newPos) => {
    const bufferSize = 5;
    positionBuffer.current.push(newPos);

    if (positionBuffer.current.length > bufferSize) {
      positionBuffer.current.shift();
    }

    const avg = positionBuffer.current.reduce(
      (acc, pos) => ({
        x: acc.x + pos.x / positionBuffer.current.length,
        y: acc.y + pos.y / positionBuffer.current.length,
      }),
      { x: 0, y: 0 }
    );

    return avg;
  };

  const drawLine = (ctx, x1, y1, x2, y2) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    drawingHistory.current.push({
      x1,
      y1,
      x2,
      y2,
      style: ctx.strokeStyle,
      width: ctx.lineWidth,
    });
  };

  const redrawHistory = () => {
    const ctx = drawingCanvasRef.current.getContext("2d");
    ctx.clearRect(
      0,
      0,
      drawingCanvasRef.current.width,
      drawingCanvasRef.current.height
    );

    drawingHistory.current.forEach((line) => {
      ctx.strokeStyle = line.style;
      ctx.lineWidth = line.width;
      drawLine(ctx, line.x1, line.y1, line.x2, line.y2);
    });
  };

  const drawPositionIndicator = (ctx, x, y) => {
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI); // Draw a circle with radius 8
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.closePath();
  };

  const calculateFingerDistance = (finger1, finger2) => {
    return Math.sqrt(
      Math.pow(finger1[0] - finger2[0], 2) +
        Math.pow(finger1[1] - finger2[1], 2)
    );
  };

  const detect = async (handposeNet) => {
   
    frameCount.current += 1;

    if (webcamRef.current && webcamRef.current.video.readyState === 4) {
      const video = webcamRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      if (drawingCanvasRef.current.width !== videoWidth) {
        drawingCanvasRef.current.width = videoWidth;
        drawingCanvasRef.current.height = videoHeight;
      }

      const drawingCtx = drawingCanvasRef.current.getContext("2d");
      const ctx = canvasRef.current.getContext("2d");

      // Normalize hand coordinates to canvas size
      const hands = await handposeNet.current.estimateHands(video);
      if (hands.length > 0) {
        const hand = hands[0];
        const landmarks = hand.landmarks;

        // Assume indexTip is the tip of the finger for drawing
        const indexTip = landmarks[8];
        const normalizedX =
          indexTip[0] * (drawingCanvasRef.current.width / videoWidth);
        const normalizedY =
          indexTip[1] * (drawingCanvasRef.current.height / videoHeight);

        drawPositionIndicator(drawingCtx, normalizedX, normalizedY);

        // Draw lines when the hand is in a fist position (for drawing)
        if (isHandFist(landmarks)) {
          const currentPos = { x: normalizedX, y: normalizedY };
          const smoothedPos = smoothPosition(currentPos);

          if (lastPos.current) {
            drawLine(
              drawingCtx,
              lastPos.current.x,
              lastPos.current.y,
              smoothedPos.x,
              smoothedPos.y
            );
          }

          lastPos.current = smoothedPos;
          setIsDrawing(true);
        } else {
          if (isDrawing) {
            setTimeout(() => {
              lastPos.current = null;
              setIsDrawing(false);
              positionBuffer.current = [];
            }, 1);
          }
        }
      }
    }
  };

  // React-P5
  async function loadhands() {
    handposeNet.current = await handpose.load(); // Modify the current property
    console.log("Handpose model loaded.");
    console.log("HandposeNet:", handposeNet.current);
    setHandsloaded(true); // Use setState to update handsloaded
  }

  const setup = async (p5, canvasParentRef) => {
    p5.createCanvas(1000, 800, p5.WEBGL).parent(canvasParentRef);
    p5.background("#fffceb");

    brush.instance(p5);
    brush.load();
    brush.reDraw();

    // Brushes for each emotion
    brush.add("happy", {
      type: "custom",
      weight: 5,
      vibration: 0.08,
      opacity: 23,
      spacing: 0.6,
      blend: true,
      pressure: {
        type: "standard",
        min_max: [1.35, 1],
        curve: [0.35, 0.25],
      },
      rotate: "natural",
    });

    brush.add("sad", {
      type: "custom",
      weight: 5,
      vibration: 0.08,
      opacity: 10,
      spacing: 3,
      blend: true,
      pressure: {
        type: "standard",
        min_max: [1.35, 1],
        curve: [0.35, 0.25],
      },
      rotate: "natural",
    });

    brush.add("angry", {
      type: "custom",
      weight: 10,
      vibration: 0.5,
      opacity: 28,
      spacing: 1,
      blend: true,
      pressure: {
        type: "standard",
        min_max: [1.35, 1],
        curve: [0.35, 0.25],
      },
      rotate: "natural",
    });

    const anxietyAttack = () => {
      return {
        type: "custom",
        weight: Math.random() * 10,
        vibration: Math.random() * 0.2,
        opacity: Math.floor(Math.random() * 100),
        spacing: Math.random() * 5,
        blend: Math.random() < 0.5,
        pressure: {
          type: "standard",
          min_max: [Math.random() * 2, 0.5],
          curve: [Math.random(), Math.random()],
        },
        rotate: "natural",
      };
    };
    
    brush.add("anxiety", anxietyAttack());

    brush.noHatch();
    brush.noField();
    brush.noStroke();

    loadhands();
  };

  let lastAnxietyTime = 0; // just fyi, it logs the last anxiety attack
  const anxietyCooldown = 3000;

  const draw = async (p5) => {
    if (webcamRef.current && webcamRef.current.video.readyState === 4) {
      const video = webcamRef.current.video;

      detections.current = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      setFaceDetections(detections.current);

      if (detections.current.length > 0) {
        const expressions = detections.current[0].expressions;
        const availableEmotions = [
          expressions.happy,
          expressions.sad,
          expressions.angry,
        ];

        switch (availableEmotions.indexOf(Math.max(...availableEmotions))) {
          case 0:
            brush.pick("happy");
            setColor("#ffba59");
            break;
          case 1:
            brush.pick("sad");
            setColor("#002185");
            break;
          case 2:
            brush.pick("angry");
            setColor("#9c1012");
            break;
          default:
            break;
        }
      }

      // Randomly trigger the anxiety brush
      if (Math.random() < 0.3 && (Date.now() - lastAnxietyTime) > anxietyCooldown) { // 30% chance of system having an anxiety attack
        brush.set("anxiety");
        setColor("#FF5733");
        lastAnxietyTime = Date.now();
        }


      if (handsloaded) {
        const hands = await handposeNet.current.estimateHands(video);

        if (hands.length > 0) {
          const hand = hands[0];
          const landmarks = hand.landmarks;
          const thumbTip = landmarks[4];
          const indexTip = landmarks[8];
          const middleTip = landmarks[12];

          const thumbIndexDistance = calculateFingerDistance(
            thumbTip,
            indexTip
          );
          const indexMiddleDistance = calculateFingerDistance(
            indexTip,
            middleTip
          );

          if (thumbIndexDistance < 40 && indexMiddleDistance > 30) {
            const currentPos = {
              x: p5.map(indexTip[0], 0, video.videoWidth, 0, p5.width),
              y: p5.map(indexTip[1], 0, video.videoHeight, 0, p5.height),
            };

            const smoothedPos = smoothPosition(currentPos);
            
            lastPos.current = smoothedPos;            
          }
        }
      }
    }

    if (p5.mouseIsPressed) {
      let x = p5.mouseX;
      let y = p5.mouseY;

    //it throws error here
      brush.bleed(p5.random(0.05, 0.4));
      brush.fillTexture(0.55, 0.5);
      brush.fill(color, p5.random(80, 140));
      brush.rect(x, y, 100, 100);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <Webcam
          ref={webcamRef}
          videoConstraints={{
            facingMode: "user",
          }}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            zIndex: 9,
            width: 320,
            height: 240,
            // transform: "scaleX(-1)",
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 9,
            width: 640,
            height: 480,
          }}
        />

      <canvas
          ref={drawingCanvasRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 10,
            width: 640,
            height: 480,
            background: "white",
            opacity: 0,
          }}
        />

        <Sketch setup={setup} draw={draw} />
      </header>
    </div>
  );
}

export default App;
