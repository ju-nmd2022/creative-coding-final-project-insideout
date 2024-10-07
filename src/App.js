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

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef(null);
  const drawingHistory = useRef([]);
  const frameCount = useRef(0);
  const positionBuffer = useRef([]); // Buffer for position smoothing

  // State to hold face detections
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
    const handposeNet = await handpose.load();
    console.log("Handpose model loaded.");

    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    await faceapi.nets.faceExpressionNet.loadFromUri("/models");

    console.log("Face API models loaded.");

    setInterval(() => {
      detect(handposeNet);
    }, 16); // Increased frame rate to ~60fps for smoother detection
  };

  // Smoothing function for positions
  const smoothPosition = (newPos) => {
    const bufferSize = 5; // Adjust this value to change smoothing amount
    positionBuffer.current.push(newPos);

    if (positionBuffer.current.length > bufferSize) {
      positionBuffer.current.shift();
    }

    // Calculate average position
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

  // Helper function to calculate finger distance
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

      // Set canvas dimensions
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      if (drawingCanvasRef.current.width !== videoWidth) {
        drawingCanvasRef.current.width = videoWidth;
        drawingCanvasRef.current.height = videoHeight;
      }

      const drawingCtx = drawingCanvasRef.current.getContext("2d");

      // Hand detection
      const hands = await handposeNet.estimateHands(video);
      const ctx = canvasRef.current.getContext("2d");
      drawHand(hands, ctx);

      if (hands.length > 0) {
        const hand = hands[0];
        const landmarks = hand.landmarks;
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];

        // Calculate distances between fingers
        const thumbIndexDistance = calculateFingerDistance(thumbTip, indexTip);
        const indexMiddleDistance = calculateFingerDistance(
          indexTip,
          middleTip
        );

        // Check if thumb and index are close (drawing gesture)
        // Also check if index and middle fingers are apart (to prevent unwanted drawing)
        if (thumbIndexDistance < 40 && indexMiddleDistance > 30) {
          const currentPos = {
            x: indexTip[0],
            y: indexTip[1],
          };

          // Apply smoothing to the current position
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
          // Only reset last position if we've been not drawing for a few frames
          // This helps prevent gaps in lines during brief tracking issues
          if (isDrawing) {
            setTimeout(() => {
              lastPos.current = null;
              setIsDrawing(false);
              positionBuffer.current = []; // Clear position buffer
            }, 100); // Adjust this delay as needed
          }
        }
      }

      // Face detection (reduced frequency to improve performance)
      if (frameCount.current % 3 === 0) {
        // Only run face detection every 3rd frame
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions();

        // Update state with current face detections
        setFaceDetections(detections);

        faceapi.matchDimensions(canvasRef.current, {
          width: videoWidth,
          height: videoHeight,
        });

        const resizedDetections = faceapi.resizeResults(detections, {
          width: videoWidth,
          height: videoHeight,
        });

        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, videoWidth, videoHeight);

        // Removed the drawing of detections to keep face points hidden
        // faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
        // faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
        // faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);

        // Set drawing color based on detected expressions
        if (detections.length > 0) {
          const expressions = detections[0].expressions;

          // Set line color based on detected expression
          if (expressions.happy > 0.5) {
            drawingCtx.strokeStyle = "yellow"; // Happy
          } else if (expressions.angry > 0.5) {
            drawingCtx.strokeStyle = "red"; // Angry
          } else {
            drawingCtx.strokeStyle = "blue"; // Default color
          }

          console.log("Detected Expressions: ", expressions);
        }
      }
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <Webcam
          ref={webcamRef}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            zIndex: 9,
            width: 320,
            height: 240,
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
            opacity: 0.5,
          }}
        />
      </header>
    </div>
  );
}

export default App;
