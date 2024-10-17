// The hand detection functionality in this project is based on the tutorial by Nicholas Renotte:
// Title: Real Time AI HAND POSE Estimation with Javascript, Tensorflow.JS and React.JS
// YouTube vide link: https://www.youtube.com/watch?v=f7uBsb-0sGQ&t=675s

import React, { useRef, useEffect, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as handpose from "@tensorflow-models/handpose";
import * as faceapi from "face-api.js";
import Webcam from "react-webcam";
import "./App.css";
//import { drawHand } from "./utilities";
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
  const [color, setColor] = useState("ffba59");

  const [faceDetections, setFaceDetections] = useState([]);

  useEffect(() => {
    runDetection();
    // setupDrawingCanvas();
  }, []);

  // const setupDrawingCanvas = () => {
  //   const drawingCanvas = drawingCanvasRef.current;
  //   const ctx = drawingCanvas.getContext("2d");
  //   ctx.strokeStyle = "blue"; // Default stroke color
  //   ctx.lineWidth = 4;
  //   ctx.lineCap = "round";
  //   ctx.lineJoin = "round"; // Smooth line joins
  // };

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

  // const redrawHistory = () => {
  //   const ctx = drawingCanvasRef.current.getContext("2d");
  //   ctx.clearRect(
  //     0,
  //     0,
  //     drawingCanvasRef.current.width,
  //     drawingCanvasRef.current.height
  //   );

  //   drawingHistory.current.forEach((line) => {
  //     ctx.strokeStyle = line.style;
  //     ctx.lineWidth = line.width;
  //     drawLine(ctx, line.x1, line.y1, line.x2, line.y2);
  //   });
  // };

  const calculateFingerDistance = (finger1, finger2) => {
    return Math.sqrt(
      Math.pow(finger1[0] - finger2[0], 2) +
        Math.pow(finger1[1] - finger2[1], 2)
    );
  };

  // React-P5
  async function loadhands() {
    handposeNet.current = await handpose.load(); // Modify the current property
    console.log("Handpose model loaded.");
    console.log("HandposeNet:", handposeNet.current);
    setHandsloaded(true); // Use setState to update handsloaded
  }

  const setup = async (p5, canvasParentRef) => {
    p5.createCanvas(
      p5.windowWidth * 0.9,
      p5.windowHeight * 0.9,
      p5.WEBGL
    ).parent(canvasParentRef);
    p5.background("#ffffff");
    p5.frameRate(60);

    const saveBtn = p5.createButton("Save Canvas");
    saveBtn.position(20, 20);
    saveBtn.mousePressed(() => {
      p5.saveCanvas("canvas", "png");
    });

    brush.instance(p5);
    brush.load();
    brush.reDraw();

    loadhands();

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

    brush.add("anxiety", {
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
    });

    brush.add("disgust", {
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
    });

    brush.add("fear", {
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
    });

    brush.add("envy", {
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
    });

    brush.add("embarassment", {
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
    });

    brush.add("boredom", {
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
    });

    brush.add("nostalgia", {
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
    });

    brush.add("sceptisism", {
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
    });

    brush.add("jealousy", {
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
    });

    brush.add("schadenfreude", {
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
    });

    brush.add("shame", {
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
    });

    brush.add("greed", {
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
    });
  };

  let emotionTriggered = false;
  let lastTriggerTime = 0;
  const triggerCooldown = 5000;

  let lastAnxietyTime = 0;
  const anxietyCooldown = 3000;

  // let lastDisgustTime = 0;
  // const disgustCooldown = 3000;

  // let lastFearTime = 0;
  // const fearCooldown = 3000;

  let lastEnvyTime = 0;
  const envyCooldown = 3000;

  let lastEmbarassmentTime = 0;
  const embarassmentCooldown = 3000;

  let lastBoredomTime = 0;
  const boredomCooldown = 3000;

  let lastNostalgiaTime = 0;
  const nostalgiaCooldown = 3000;

  let lastSceptisismTime = 0;
  const sceptisismCooldown = 3000;

  let lastJealousyTime = 0;
  const jealousyCooldown = 3000;

  let lastSchadenfreudeTime = 0;
  const schadenfreudeCooldown = 3000;

  let lastShameTime = 0;
  const shameCooldown = 3000;

  let lastGreedTime = 0;
  const greedCooldown = 3000;

  const draw = async (p5) => {
    if (webcamRef.current && webcamRef.current.video.readyState === 4) {
      const video = webcamRef.current.video;

      detections.current = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      //console.log("Face Detections:", detections.current);

      setFaceDetections(detections.current);

      if (detections.current.length > 0 && !emotionTriggered) {
        const expressions = detections.current[0].expressions;
        const availableEmotions = [
          expressions.happy,
          expressions.sad,
          expressions.angry,
          expressions.disgusted,
          expressions.fearful,
        ];

        switch (availableEmotions.indexOf(Math.max(...availableEmotions))) {
          case 0:
            brush.pick("happy");
            setColor("#ffde59");
            break;
          case 1:
            brush.pick("sad");
            setColor("#38b6ff");
            break;
          case 2:
            brush.pick("angry");
            setColor("#ff1717");
            break;
          case 3:
            brush.pick("disgust");
            setColor("#c9e165");
            break;
          case 4:
            brush.pick("fear");
            setColor("#c9e165");
            break;
          default:
            break;
        }
      }

      // Randomly trigger the anxiety brush
      if (
        Math.random() < 0.3 &&
        Date.now() - lastAnxietyTime > anxietyCooldown
      ) {
        // 30% chance of system having an anxiety attack
        brush.pick("anxiety");
        setColor("#f67122");
        lastAnxietyTime = Date.now();
        lastTriggerTime = Date.now();
      }

      // // Randomly trigger disgust
      // if (
      //   Math.random() < 0.3 &&
      //   Date.now() - lastDisgustTime > disgustCooldown
      // ) {
      //   brush.pick("disgust");
      //   setColor("#c9e165");
      //   lastDisgustTime = Date.now();
      //   lastTriggerTime = Date.now();
      // }

      // // Randomly trigger fear
      // if (
      //   Math.random() < 0.3 &&
      //   Date.now() - lastFearTime > fearCooldown
      // ) {
      //   brush.pick("fear");
      //   setColor("#c9e165");
      //   lastFearTime = Date.now();
      //   lastTriggerTime = Date.now();
      // }

      // Randomly trigger envy
      if (Math.random() < 0.02 && Date.now() - lastEnvyTime > envyCooldown) {
        lastEnvyTime = Date.now();
        lastTriggerTime = Date.now();
      }

      // Randomly trigger embarassment
      if (
        Math.random() < 0.02 &&
        Date.now() - lastEmbarassmentTime > embarassmentCooldown
      ) {
        brush.pick("embarassment");
        setColor("#f85ebe");
        lastEmbarassmentTime = Date.now();
        lastTriggerTime = Date.now();
      }

      // Randomly trigger boredom
      if (
        Math.random() < 0.02 &&
        Date.now() - lastBoredomTime > boredomCooldown
      ) {
        setColor("#5e69b9");
        lastBoredomTime = Date.now();
        lastTriggerTime = Date.now();
      }

      // Randomly trigger nostalgia
      if (
        Math.random() < 0.02 &&
        Date.now() - lastNostalgiaTime > nostalgiaCooldown
      ) {
        brush.pick("nostalgia");
        setColor("#ae8175");
        lastNostalgiaTime = Date.now();
        lastTriggerTime = Date.now();
      }

      // Randomly trigger sceptisism
      if (
        Math.random() < 0.02 &&
        Date.now() - lastSceptisismTime > sceptisismCooldown
      ) {
        brush.pick("sceptisism");
        setColor("#7f832e");
        lastSceptisismTime = Date.now();
        lastTriggerTime = Date.now();
      }

      // Randomly trigger jealousy
      if (
        Math.random() < 0.02 &&
        Date.now() - lastJealousyTime > jealousyCooldown
      ) {
        brush.pick("jealousy");
        setColor("#a5cd98");
        lastJealousyTime = Date.now();
        lastTriggerTime = Date.now();
      }

      // Randomly trigger schadenfreude
      if (
        Math.random() < 0.02 &&
        Date.now() - lastSchadenfreudeTime > schadenfreudeCooldown
      ) {
        setColor("#a5cd98");
        lastSchadenfreudeTime = Date.now();
        lastTriggerTime = Date.now();
      }

      // Randomly trigger shame
      if (Math.random() < 0.02 && Date.now() - lastShameTime > shameCooldown) {
        brush.pick("shame");
        setColor("#6c959f");
        lastShameTime = Date.now();
        lastTriggerTime = Date.now();
      }

      // Randomly trigger greed
      if (Math.random() < 0.02 && Date.now() - lastGreedTime > greedCooldown) {
        brush.pick("greed");
        setColor("#29c784");
        lastGreedTime = Date.now();
        lastTriggerTime = Date.now();
      }

      if (handsloaded) {
        const hands = await handposeNet.current.estimateHands(video);

        if (hands.length > 0) {
          const hand = hands[0];
          const landmarks = hand.landmarks;
          const thumbTip = landmarks[4];
          const indexTip = landmarks[8];
          const middleTip = landmarks[12];

          const ctx = canvasRef.current.getContext("2d");

          ctx.clearRect(
            0,
            0,
            drawingCanvasRef.current.width,
            drawingCanvasRef.current.height
          );

          ctx.beginPath();
          ctx.arc(
            drawingCanvasRef.current.width -
              indexTip[0] * (drawingCanvasRef.current.width / video.videoWidth),
            indexTip[1] * (drawingCanvasRef.current.height / video.videoHeight),
            2,
            0,
            5
          );
          ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
          ctx.fill();
          ctx.closePath();

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
              x: p5.map(indexTip[0], 0, video.videoWidth, p5.width, 0),
              y: p5.map(indexTip[1], 0, video.videoHeight, 0, p5.height),
            };

            const smoothedPos = smoothPosition(currentPos);

            brush.noHatch();
            brush.noField();
            brush.noStroke();
            brush.bleed(p5.random(0.05, 0.4));
            brush.fillTexture(0.55, 0.5);
            brush.fill(color, p5.random(80, 140));
            brush.rect(
              smoothedPos.x - p5.width / 2,
              smoothedPos.y - p5.height / 2,
              100,
              100
            );

            // if (lastPos.current) {

            // }
            // lastPos.current = smoothedPos;
          }
        }
      }
    }

    if (p5.mouseIsPressed) {
      let x = p5.mouseX;
      let y = p5.mouseY;

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
            opacity: 0,
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
            width: "100vw",
            height: "100vh",
            background: "transparent",
          }}
        />

        <Sketch setup={setup} draw={draw} />
      </header>
    </div>
  );
}

export default App;
