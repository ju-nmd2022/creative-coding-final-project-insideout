let handpose;
let video;
let pg;
let hands = [];
const resolution = 800;

function preload() {
  handpose = ml5.handPose();
}

function setup() {
  createCanvas(2 * resolution, resolution);
  background(255);

  video = createCapture(VIDEO);
  video.size(resolution, resolution);
  video.hide();

  frameRate(60);

  handpose.detectStart(video, getHandsData);
}

function draw() {
  // Flips the camera and draws a photo of it
  translate(resolution, 0);
  scale(-1, 1);
  image(video, -resolution, 0, resolution, resolution);

  // Clear and create an overlay on the canvas.
  // Creates a circle between the size of the distance between the index finger and thumb
  // From Bassima Example
  // for (let hand of hands) {
  //   let indexFinger = hand.index_finger_tip;
  //   let thumb = hand.thumb_tip;

  //   let centerX = (indexFinger.x + thumb.x) / 2;
  //   let centerY = (indexFinger.y + thumb.y) / 2;

  //   let distance = dist(indexFinger.x, indexFinger.y, thumb.x, thumb.y);

  //   stroke(0);
  //   strokeWeight(2);
  //   noFill();
  //   ellipse(centerX, centerY, distance);
  // }

  //////////////////CODE FOR DRAWING ELLIPSE ON THE INDEX FINGER AND THUMB//////////////////
  // From Bassima example
  if (hands.length > 0) {
    let indexFinger = hands[0].index_finger_tip;
    let thumb = hands[0].thumb_tip;

    fill(0, 255, 0);
    ellipse(indexFinger.x, indexFinger.y, 10);
    ellipse(thumb.x, thumb.y, 10);
  }
  //////////////////CODE FOR DRAWING ELLIPSE ON THE INDEX FINGER AND THUMB//////////////////
}

function getHandsData(results) {
  hands = results;
}

// "Cursor" overlay on the canvas.
// A seperate p5 instance that creates a circle between the index finger and thumb.
// Aims to help the user know where they are drawing on the canvas at all times.
// On a seperate p5 instance and canvas so it doesnt interfere with the drawing.
let overlay = function (overlay) {
  overlay.setup = function () {
    let graphicCanvas = overlay.createCanvas(resolution, resolution);
    graphicCanvas.position(0, 0);
  }
  overlay.draw = function () {
    overlay.clear();
    overlay.translate(resolution, 0);
    overlay.scale(-1, 1);

    for (let hand of hands) {
      let indexFinger = hand.index_finger_tip;
      let thumb = hand.thumb_tip;

      let centerX = (indexFinger.x + thumb.x) / 2;
      let centerY = (indexFinger.y + thumb.y) / 2;

      let distance = dist(indexFinger.x, indexFinger.y, thumb.x, thumb.y);

      overlay.stroke(0);
      overlay.strokeWeight(2);
      overlay.noFill();
      overlay.ellipse(centerX, centerY, distance);
    }
  }
};
new p5(overlay);