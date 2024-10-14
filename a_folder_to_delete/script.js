let handpose;
let video;
let hands = [];
let loading;
//experiment with performance
let detectionInterval = 200; // this one is in milliseconds ;)
let lastDetectionTime = 0;

function preload() {
  handpose = ml5.handPose(modelReady);
  loading = true;
}

function setup() {
  createCanvas(innerWidth, innerHeight);
  //frameRate(60);
  //trying out for performance
  frameRate(15);
  background(255);

  video = createCapture(VIDEO);
  //video.size(innerWidth, innerHeight);
  //trying out this for performance
  video.size(160, 120);
  video.hide();

  //handpose.detectStart(video, getHandsData);
  //trying out another method for performance
    handpose.on('predict', getHandsData); // Use the on() method instead of detectStart
    textAlign(CENTER);
    textSize(48);
    fill(255);
    text("Loading...", width / 2, height / 2);
  }



function draw() {
  // Flips the camera and draws a photo of it
  translate(innerWidth, 0);
  scale(-1, 1);
  
  image(video, 0, 0, innerWidth, innerHeight);

  //experiment for performance, idk if it will work but worth a try
  let currentTime = millis();
  if (currentTime - lastDetectionTime > detectionInterval) {
    handpose.detect(video, getHandsData); // this detects hands
    lastDetectionTime = currentTime;
  }

  if (hands.length > 0) {
    let middle = hands[0].middle_finger_tip;
    let index = hands[0].index_finger_tip;
    let thumb = hands[0].thumb_tip;

    if (dist(middle.x, middle.y, thumb.x, thumb.y) < 100) {
      let centerX = (index.x + thumb.x) / 2;
      let centerY = (index.y + thumb.y) / 2;

      //let distance = dist(index.x, index.y, thumb.x, thumb.y);
      let distance = 100;

      noStroke();
      fill("blue");
      ellipse(centerX, centerY, distance);
    }
  }
}

function getHandsData(results) {
  hands = results;
}

function modelReady() {
  loading = false;
}

// "Cursor" overlay on the canvas.
// A seperate p5 instance that creates a circle between the index finger and thumb.
// Aims to help the user know where they are drawing on the canvas at all times.
// On a seperate p5 instance and canvas so it doesnt interfere with the drawing.
let overlay = function (overlay) {
  overlay.setup = function () {
    let graphicCanvas = overlay.createCanvas(innerWidth, innerHeight);
    graphicCanvas.position(0, 0);
  }
  overlay.draw = function () {
    overlay.clear();
    overlay.translate(innerWidth, 0);
    overlay.scale(-1, 1);

   /*  for (let hand of hands) {
      let index = hand.index_finger_tip;
      let thumb = hand.thumb_tip;

      let centerX = (index.x + thumb.x) / 2;
      let centerY = (index.y + thumb.y) / 2;

      let distance = dist(index.x, index.y, thumb.x, thumb.y);

      overlay.stroke(0);
      overlay.strokeWeight(2);
      overlay.noFill();
      overlay.ellipse(centerX, centerY, distance);
    } */

      //trying out this because i think it might actually work better because it runs it only when there are hands detected, therefore might be faster?
      if (hands.length > 0) {
        for (let hand of hands) {
          let index = hand.index_finger_tip;
          let thumb = hand.thumb_tip;
  
          let centerX = (index.x + thumb.x) / 2;
          let centerY = (index.y + thumb.y) / 2;
  
          let distance = dist(index.x, index.y, thumb.x, thumb.y);
  
          overlay.stroke(0);
          overlay.strokeWeight(2);
          overlay.noFill();
          overlay.ellipse(centerX, centerY, distance);
        }
      }

    //trying to minimise how heavy the code is
     if (loading) {
      overlay.push();
      overlay.translate(innerWidth, 0);
      overlay.scale(-1, 1);
      //overlay.fill(0);
      //overlay.rect(0, 0, innerWidth, innerHeight);
      overlay.textSize(48);
      overlay.fill(255);
      overlay.text("loading...", 100, 100);
      overlay.pop();
    } 
  }
};
new p5(overlay);