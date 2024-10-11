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

  const setup = (p5, canvasParentRef) => {
    p5.createCanvas(800, 800, p5.WEBGL).parent(canvasParentRef);
    p5.background("#fffceb");

    brush.instance(p5);
    brush.load();
    brush.reDraw();

    brush.noHatch();
    brush.noField();
    brush.noStroke();
  };

  const draw = (p5) => {
    if (p5.mouseIsPressed) {
      let x = p5.mouseX - p5.width / 2;
      let y = p5.mouseY - p5.height / 2;

      brush.bleed(p5.random(0.05, 0.4));
      brush.fillTexture(0.55, 0.5);
      brush.fill("#002185", p5.random(80, 140));
      brush.rect(x, y, 100, 100);
    }
  };

  const runDetection = async () => {
    const handposeNet = await handpose.load();
    console.log("Handpose model loaded.");
    console.log("HandposeNet:", handposeNet);

    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    await faceapi.nets.faceExpressionNet.loadFromUri("/models");

    console.log("Face API models loaded.");

    setInterval(() => {
      detect(handposeNet);
    }, 60);
  };

  // Helper function to calculate distance between two 3D points
  const calculate3DDistance = (point1, point2) => {
    return Math.sqrt(
      Math.pow(point1[0] - point2[0], 2) +
        Math.pow(point1[1] - point2[1], 2) +
        Math.pow(point1[2] - point2[2], 2)
    );
  };

  // Function to detect if hand is making a fist
  const isHandFist = (landmarks) => {
    // Get palm base point (landmark 0)
    const palmBase = landmarks[0];

    // Get fingertip points (landmarks 4, 8, 12, 16, 20)
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // Calculate distances from each fingertip to palm base
    const thumbDistance = calculate3DDistance(thumbTip, palmBase);
    const indexDistance = calculate3DDistance(indexTip, palmBase);
    const middleDistance = calculate3DDistance(middleTip, palmBase);
    const ringDistance = calculate3DDistance(ringTip, palmBase);
    const pinkyDistance = calculate3DDistance(pinkyTip, palmBase);

    // Get palm width (distance between landmarks 5 and 17)
    const palmWidth = calculate3DDistance(landmarks[5], landmarks[17]);

    // Calculate average finger distance
    const avgFingerDistance =
      (thumbDistance +
        indexDistance +
        middleDistance +
        ringDistance +
        pinkyDistance) /
      5;

    // A fist is detected when all fingertips are relatively close to the palm base
    const threshold = palmWidth * 1.2; // Adjust this multiplier to make detection more or less sensitive

    return avgFingerDistance < threshold;
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

        // Check if hand is making a fist
        if (isHandFist(landmarks)) {
          const indexTip = landmarks[8]; // Using index finger tip as drawing point
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
          if (isDrawing) {
            setTimeout(() => {
              lastPos.current = null;
              setIsDrawing(false);
              positionBuffer.current = []; // Clear position buffer
            }, 100);
          }
        }
      }

      // Face detection (reduced frequency to improve performance)
      if (frameCount.current % 3 === 0) {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions();

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

        // Set drawing color based on detected expressions
        if (detections.length > 0) {
          const expressions = detections[0].expressions;

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

        <Sketch setup={setup} draw={draw} />
      </header>
    </div>
  );
}

export default App;

// // The hand detection functionality in this project is based on the tutorial by Nicholas Renotte:
// // Title: Real Time AI HAND POSE Estimation with Javascript, Tensorflow.JS and React.JS
// // YouTube vide link: https://www.youtube.com/watch?v=f7uBsb-0sGQ&t=675s

// import React, { useRef, useEffect, useState } from "react";
// import * as tf from "@tensorflow/tfjs";
// import * as handpose from "@tensorflow-models/handpose";
// import * as faceapi from "face-api.js";
// import Webcam from "react-webcam";
// import "./App.css";
// import { drawHand } from "./utilities";
// //import p5 from 'p5';
// import Sketch from "react-p5";
// import * as brush from "p5.brush";

// function App() {
//   const webcamRef = useRef(null);
//   const canvasRef = useRef(null);
//   const drawingCanvasRef = useRef(null);
//   const [isDrawing, setIsDrawing] = useState(false);
//   const lastPos = useRef(null);
//   const drawingHistory = useRef([]);
//   const frameCount = useRef(0);
//   const positionBuffer = useRef([]); // Buffer for position smoothing

//   // State to hold face detections
//   const [faceDetections, setFaceDetections] = useState([]);

//   useEffect(() => {
//     runDetection();
//     setupDrawingCanvas();
//   }, []);

//   const setupDrawingCanvas = () => {
//     const drawingCanvas = drawingCanvasRef.current;
//     const ctx = drawingCanvas.getContext("2d");
//     ctx.strokeStyle = "blue"; // Default stroke color
//     ctx.lineWidth = 4;
//     ctx.lineCap = "round";
//     ctx.lineJoin = "round"; // Smooth line joins
//   };

//   const setup = (p5, canvasParentRef) => {
//     p5.createCanvas(800, 800, p5.WEBGL).parent(canvasParentRef);
//     p5.background("#fffceb");

//     brush.instance(p5);
//     brush.load();
//     brush.reDraw();

//     // Unchanged brush settings
//     brush.noHatch();
//     brush.noField();
//     brush.noStroke();
//   };

//   const draw = (p5) => {
//     if (p5.mouseIsPressed) {
//       // 0, 0 is the center of the canvas, so we calculate the x and y
//       let x = p5.mouseX - p5.width / 2;
//       let y = p5.mouseY - p5.height / 2;

//       // Randomness :)
//       brush.bleed(p5.random(0.05, 0.4));
//       brush.fillTexture(0.55, 0.5);
//       brush.fill("#002185", p5.random(80, 140));
//       brush.rect(x, y, 100, 100);
//     }
//   };

//   const runDetection = async () => {
//     const handposeNet = await handpose.load();
//     console.log("Handpose model loaded.");
//     console.log("HandposeNet:", handposeNet);

//     await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
//     await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
//     await faceapi.nets.faceExpressionNet.loadFromUri("/models");

//     console.log("Face API models loaded.");

//     setInterval(() => {
//       detect(handposeNet);
//     }, 60); // Increased frame rate to ~60fps for smoother detection
//   };

//   // Smoothing function for positions
//   const smoothPosition = (newPos) => {
//     const bufferSize = 5; // Adjust this value to change smoothing amount
//     positionBuffer.current.push(newPos);

//     if (positionBuffer.current.length > bufferSize) {
//       positionBuffer.current.shift();
//     }

//     // Calculate average position
//     const avg = positionBuffer.current.reduce(
//       (acc, pos) => ({
//         x: acc.x + pos.x / positionBuffer.current.length,
//         y: acc.y + pos.y / positionBuffer.current.length,
//       }),
//       { x: 0, y: 0 }
//     );

//     return avg;
//   };

//   const drawLine = (ctx, x1, y1, x2, y2) => {
//     ctx.beginPath();
//     ctx.moveTo(x1, y1);
//     ctx.lineTo(x2, y2);
//     ctx.stroke();

//     drawingHistory.current.push({
//       x1,
//       y1,
//       x2,
//       y2,
//       style: ctx.strokeStyle,
//       width: ctx.lineWidth,
//     });
//   };

//   const redrawHistory = () => {
//     const ctx = drawingCanvasRef.current.getContext("2d");
//     ctx.clearRect(
//       0,
//       0,
//       drawingCanvasRef.current.width,
//       drawingCanvasRef.current.height
//     );

//     drawingHistory.current.forEach((line) => {
//       ctx.strokeStyle = line.style;
//       ctx.lineWidth = line.width;
//       drawLine(ctx, line.x1, line.y1, line.x2, line.y2);
//     });
//   };

//   // Helper function to calculate finger distance
//   const calculateFingerDistance = (finger1, finger2) => {
//     return Math.sqrt(
//       Math.pow(finger1[0] - finger2[0], 2) +
//         Math.pow(finger1[1] - finger2[1], 2)
//     );
//   };

//   const detect = async (handposeNet) => {
//     frameCount.current += 1;

//     if (webcamRef.current && webcamRef.current.video.readyState === 4) {
//       const video = webcamRef.current.video;
//       const videoWidth = video.videoWidth;
//       const videoHeight = video.videoHeight;

//       // Set canvas dimensions
//       canvasRef.current.width = videoWidth;
//       canvasRef.current.height = videoHeight;

//       if (drawingCanvasRef.current.width !== videoWidth) {
//         drawingCanvasRef.current.width = videoWidth;
//         drawingCanvasRef.current.height = videoHeight;
//       }

//       const drawingCtx = drawingCanvasRef.current.getContext("2d");

//       // Hand detection
//       const hands = await handposeNet.estimateHands(video);
//       const ctx = canvasRef.current.getContext("2d");
//       drawHand(hands, ctx);

//       if (hands.length > 0) {
//         const hand = hands[0];
//         const landmarks = hand.landmarks;
//         const thumbTip = landmarks[4];
//         const indexTip = landmarks[8];
//         const middleTip = landmarks[12];
//         console.log("Hand", hand);

//         // Calculate distances between fingers
//         const thumbIndexDistance = calculateFingerDistance(thumbTip, indexTip);
//         const indexMiddleDistance = calculateFingerDistance(
//           indexTip,
//           middleTip
//         );

//         // Check if thumb and index are close (drawing gesture)
//         // Also check if index and middle fingers are apart (to prevent unwanted drawing)
//         if (thumbIndexDistance < 40 && indexMiddleDistance > 30) {
//           const currentPos = {
//             x: indexTip[0],
//             y: indexTip[1],
//           };

//           // Apply smoothing to the current position
//           const smoothedPos = smoothPosition(currentPos);

//           if (lastPos.current) {
//             drawLine(
//               drawingCtx,
//               lastPos.current.x,
//               lastPos.current.y,
//               smoothedPos.x,
//               smoothedPos.y
//             );
//           }

//           lastPos.current = smoothedPos;
//           setIsDrawing(true);
//         } else {
//           // Only reset last position if we've been not drawing for a few frames
//           // This helps prevent gaps in lines during brief tracking issues
//           if (isDrawing) {
//             setTimeout(() => {
//               lastPos.current = null;
//               setIsDrawing(false);
//               positionBuffer.current = []; // Clear position buffer
//             }, 100); // Adjust this delay as needed
//           }
//         }
//       }

//       // Face detection (reduced frequency to improve performance)
//       if (frameCount.current % 3 === 0) {
//         // Only run face detection every 3rd frame
//         const detections = await faceapi
//           .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
//           .withFaceLandmarks()
//           .withFaceExpressions();

//         // Update state with current face detections
//         setFaceDetections(detections);

//         faceapi.matchDimensions(canvasRef.current, {
//           width: videoWidth,
//           height: videoHeight,
//         });

//         const resizedDetections = faceapi.resizeResults(detections, {
//           width: videoWidth,
//           height: videoHeight,
//         });

//         const ctx = canvasRef.current.getContext("2d");
//         ctx.clearRect(0, 0, videoWidth, videoHeight);

//         // Removed the drawing of detections to keep face points hidden
//         // faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
//         // faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
//         // faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);

//         // Set drawing color based on detected expressions
//         if (detections.length > 0) {
//           const expressions = detections[0].expressions;

//           // Set line color based on detected expression
//           if (expressions.happy > 0.5) {
//             drawingCtx.strokeStyle = "yellow"; // Happy
//           } else if (expressions.angry > 0.5) {
//             drawingCtx.strokeStyle = "red"; // Angry
//           } else {
//             drawingCtx.strokeStyle = "blue"; // Default color
//           }

//           console.log("Detected Expressions: ", expressions);
//         }
//       }
//     }
//   };

//   return (
//     <div className="App">
//       <header className="App-header">
//         <Webcam
//           ref={webcamRef}
//           style={{
//             position: "absolute",
//             bottom: 0,
//             left: 0,
//             zIndex: 9,
//             width: 320,
//             height: 240,
//           }}
//         />

//         <canvas
//           ref={canvasRef}
//           style={{
//             position: "absolute",
//             marginLeft: "auto",
//             marginRight: "auto",
//             left: 0,
//             right: 0,
//             textAlign: "center",
//             zIndex: 9,
//             width: 640,
//             height: 480,
//           }}
//         />

//         <canvas
//           ref={drawingCanvasRef}
//           style={{
//             position: "absolute",
//             marginLeft: "auto",
//             marginRight: "auto",
//             left: 0,
//             right: 0,
//             textAlign: "center",
//             zIndex: 10,
//             width: 640,
//             height: 480,
//             background: "white",
//             opacity: 0.5,
//           }}
//         />

//         <Sketch setup={setup} draw={draw} />
//       </header>
//     </div>
//   );
// }

// export default App;
