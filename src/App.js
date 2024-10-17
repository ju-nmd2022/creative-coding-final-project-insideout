// The hand detection functionality in this project is based on the tutorial by Nicholas Renotte:
// Title: Real Time AI HAND POSE Estimation with Javascript, Tensorflow.JS and React.JS
// YouTube vide link: https://www.youtube.com/watch?v=f7uBsb-0sGQ&t=675s

import React, { useRef, useEffect, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as handpose from "@tensorflow-models/handpose";
import * as faceapi from "face-api.js";
import Webcam from "react-webcam";
import "./App.css";
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
  const [emotion, setEmotion] = useState("Neutral");
  const [sizeX, setSizeX] = useState(100);
  const [sizeY, setSizeY] = useState(100);

  const [faceDetections, setFaceDetections] = useState([]);

  useEffect(() => {
    runDetection();
  }, []);

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
    saveBtn.position(120, 75);
    saveBtn.mousePressed(() => {
      p5.saveCanvas('canvas', 'png');
    });

    brush.instance(p5);
    brush.load();
    brush.reDraw();

    loadhands();

    // Brushes for each emotion
    brush.add("happy", {
      type: "spray",
      weight: 5,
      vibration: 0.08,
      definition: 0.5,
      opacity: 50,
      spacing: 3,
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
      vibration: 5,
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

  let lastTriggerTime = 0;
  const triggerTime = 5000;

  let lastAnxietyTime = 0;
  const anxietyCooldown = 3000;

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
    if (p5.mouseIsPressed) {
      p5.saveCanvas('canvas', 'png');
    }

    if (webcamRef.current && webcamRef.current.video.readyState === 4) {
      const video = webcamRef.current.video;

      detections.current = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      setFaceDetections(detections.current);

      if (
        detections.current.length > 0 &&
        Date.now() - lastTriggerTime > triggerTime &&
        p5.frameCount % 6 === 0
      ) {
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
            setEmotion("Happy");
            setSizeX(p5.random(150, 200));
            setSizeY(100);
            brush.bleed(p5.random(0.3, 0.5), "out");
            brush.fillTexture(0.3, 0.1);
            break;
          case 1:
            brush.pick("sad");
            setColor("#38b6ff");
            setEmotion("Sad");
            setSizeX(100);
            setSizeY(p5.random(150, 200));
            brush.bleed(p5.random(0.3, 0.5), "out");
            brush.fillTexture(0.2, 1);
            break;
          case 2:
            brush.pick("angry");
            setColor("#ff1717");
            setEmotion("Angry");
            setSizeX(p5.random(150, 200));
            setSizeY(p5.random(150, 200));
            brush.bleed(p5.random(0.05, 0.2), "out");
            brush.fillTexture(0.4, 0.8);
            break;
          case 3:
            brush.pick("disgust");
            setColor("#c9e165");
            setEmotion("Disgusted");
            setSizeX(100);
            setSizeY(p5.random(120, 180));
            brush.bleed(p5.random(2, 0.4), "in");
            brush.fillTexture(0.55, 0.5);
            break;
          case 4:
            brush.pick("fear");
            setColor("#c9e165");
            setEmotion("Fearful");
            setSizeX(p5.random(120, 160));
            setSizeY(40);
            brush.bleed(p5.random(0.4, 0.5), "in");
            brush.fillTexture(0.55, p5.random(0.8, 1));
            break;
          default:
            break;
        }
      }

      // Randomly trigger the anxiety brush
      else if (
        Math.random() < 0.02 &&
        Date.now() - lastAnxietyTime > anxietyCooldown
      ) {
        brush.pick("anxiety");
        setColor("#f67122");
        setEmotion("Anxious");
        setSizeX(140);
        setSizeY(140);
        brush.bleed(p5.random(0.4, 0.5), "in");
        brush.fillTexture(0.55, p5.random(0.8, 1));
        lastAnxietyTime = Date.now();
        lastTriggerTime = Date.now();
      }

      // Randomly trigger envy
      else if (
        Math.random() < 0.02 &&
        Date.now() - lastEnvyTime > envyCooldown
      ) {
        brush.pick("envy");
        setColor("#8ead90");
        setEmotion("Envious");
        setSizeX(p5.random(150, 250));
        setSizeY(p5.random(150, 250));
        brush.bleed(p5.random(0.2, 0.5), "in");
        brush.fillTexture(0.55, 0.5);
        lastEnvyTime = Date.now();
        lastTriggerTime = Date.now();
      }

      // Randomly trigger embarassment
      else if (
        Math.random() < 0.02 &&
        Date.now() - lastEmbarassmentTime > embarassmentCooldown
      ) {
        brush.pick("embarassment");
        setColor("#f85ebe");
        setEmotion("Embarassed");
        setSizeX(p5.random(50, 100));
        setSizeY(p5.random(50, 100));
        brush.bleed(0.4, "out");
        brush.fillTexture(0.55, 0.5);
        lastEmbarassmentTime = Date.now();
        lastTriggerTime = Date.now();
      }

      // Randomly trigger boredom
      else if (
        Math.random() < 0.02 &&
        Date.now() - lastBoredomTime > boredomCooldown
      ) {
        brush.pick("boredom");
        setColor("#5e69b9");
        setEmotion("Bored");
        setSizeX(100);
        setSizeY(100);
        brush.bleed(0.05);
        brush.fillTexture(0.55, 1);
        lastBoredomTime = Date.now();
        lastTriggerTime = Date.now();
      }

      // Randomly trigger nostalgia
      else if (
        Math.random() < 0.02 &&
        Date.now() - lastNostalgiaTime > nostalgiaCooldown
      ) {
        brush.pick("nostalgia");
        setColor("#ae8175");
        setEmotion("Nostalgic");
        setSizeX(p5.random(80, 120));
        setSizeY(p5.random(80, 120));
        brush.bleed(p5.random(0.2, 0.4));
        brush.fillTexture(0.1, 0.5);
        lastNostalgiaTime = Date.now();
        lastTriggerTime = Date.now();
      }

      // Randomly trigger sceptisism
      else if (
        Math.random() < 0.02 &&
        Date.now() - lastSceptisismTime > sceptisismCooldown
      ) {
        brush.pick("sceptisism");
        setColor("#7f832e");
        setEmotion("Sceptic");
        setSizeX(90);
        setSizeY(p5.random(120, 150));
        brush.bleed(p5.random(0.05, 0.3));
        brush.fillTexture(0.55, 0.8);
        lastSceptisismTime = Date.now();
        lastTriggerTime = Date.now();
      }

      // Randomly trigger jealousy
      else if (
        Math.random() < 0.02 &&
        Date.now() - lastJealousyTime > jealousyCooldown
      ) {
        brush.pick("jealousy");
        setColor("#a5cd98");
        setEmotion("Jealous");
        setSizeX(p5.random(100, 160));
        setSizeY(p5.random(100, 160));
        brush.bleed(0.4, "in");
        brush.fillTexture(0.55, 0.5);
        lastJealousyTime = Date.now();
        lastTriggerTime = Date.now();
      }

      // Randomly trigger schadenfreude
      else if (
        Math.random() < 0.02 &&
        Date.now() - lastSchadenfreudeTime > schadenfreudeCooldown
      ) {
        brush.pick("schadenfreude");
        setColor("#a5cd98");
        setEmotion("Schadenfreude");
        setSizeX(p5.random(100, 120));
        setSizeY(p5.random(100, 130));
        brush.bleed(p5.random(0.05, 0.4), "out");
        brush.fillTexture(0.55, 1);
        lastSchadenfreudeTime = Date.now();
        lastTriggerTime = Date.now();
      }

      // Randomly trigger shame
      else if (
        Math.random() < 0.02 &&
        Date.now() - lastShameTime > shameCooldown
      ) {
        brush.pick("shame");
        setColor("#6c959f");
        setEmotion("Shameful");
        setSizeX(p5.random(100, 120));
        setSizeY(p5.random(50, 80));
        brush.bleed(p5.random(0.3, 0.4));
        brush.fillTexture(0.55, 0.2);
        lastShameTime = Date.now();
        lastTriggerTime = Date.now();
      }

      // Randomly trigger greed
      else if (
        Math.random() < 0.02 &&
        Date.now() - lastGreedTime > greedCooldown
      ) {
        brush.pick("greed");
        setColor("#29c784");
        setEmotion("Greedy");
        setSizeX(p5.random(100, 160));
        setSizeY(p5.random(100, 160));
        brush.bleed(p5.random(0.05, 0.2));
        brush.fillTexture(0.55, 0.9);
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
          // const middleTip = landmarks[12];

          const thumbIndexDistance = calculateFingerDistance(
            thumbTip,
            indexTip
          );
          // const indexMiddleDistance = calculateFingerDistance(
          //   indexTip,
          //   middleTip
          // );
          // if (thumbIndexDistance < 70 && indexMiddleDistance > 70) {
          if (thumbIndexDistance < 30) {
            const currentPos = {
              x: p5.map(indexTip[0], 0, video.videoWidth, p5.width, 0),
              y: p5.map(indexTip[1], 0, video.videoHeight, 0, p5.height),
            };

            const smoothedPos = smoothPosition(currentPos);

            brush.noHatch();
            brush.noField();
            brush.noStroke();
            brush.fill(color, p5.random(80, 140));
            brush.rect(
              smoothedPos.x - p5.width / 2,
              smoothedPos.y - p5.height / 2,
              sizeX,
              sizeY
            );
          }
        }
      }
    }
  };

  // Overlay to know where you are painting and your current emotion
  const overlaySetup = (p5, canvasParentRef) => {
    p5.createCanvas(p5.windowWidth * 0.9, p5.windowHeight * 0.9).parent(
      canvasParentRef
    );
    p5.frameRate(60);
  };

  const overlayDraw = async (p5) => {
    if (
      webcamRef.current &&
      webcamRef.current.video.readyState === 4 &&
      handsloaded
    ) {
      p5.clear();
      // p5.translate(p5.width, 0);
      // p5.scale(-1, 1);

      const video = webcamRef.current.video;

      const hands = await handposeNet.current.estimateHands(video);

      p5.textAlign(p5.RIGHT);
      p5.textSize(28);
      p5.noStroke();
      p5.fill(0);
      p5.text("Currently feeling", p5.width - 50, 50);
      p5.stroke(0);
      p5.strokeWeight(1);
      p5.fill(color);
      p5.text(emotion, p5.width - 50, 75);

      if (hands.length > 0) {
        const hand = hands[0];
        const landmarks = hand.landmarks;
        const indexTip = landmarks[8];

        p5.noFill();
        p5.stroke(0, 0, 0);
        p5.strokeWeight(2);
        p5.ellipse(
          p5.map(indexTip[0], 0, video.videoWidth, p5.width, 0),
          p5.map(indexTip[1], 0, video.videoHeight, 0, p5.height),
          30
        );
      }
    } else {
      p5.background(0, 0, 0);
      p5.textAlign(p5.CENTER);
      p5.textSize(48);
      p5.fill(255);
      p5.text("Loading...", p5.width / 2, p5.height / 2);
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
            opacity: 1,
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
            background: "white",
            opacity: 0,
          }}
        />

        <Sketch setup={setup} draw={draw} />

        <Sketch
          setup={overlaySetup}
          draw={overlayDraw}
          style={{
            position: "absolute",
          }}
        />
      </header>
    </div>
  );
}

export default App;
