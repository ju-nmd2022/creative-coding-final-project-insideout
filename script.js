let handpose;
let video;
let hands = [];
let loading;

function preload() {
  handpose = ml5.handPose();
  loading = true;
}

function setup() {
  createCanvas(innerWidth, innerHeight);
  frameRate(60);
  background(255);

  video = createCapture(VIDEO);
  video.size(innerWidth, innerHeight);
  video.hide();

  handpose.detectStart(video, getHandsData);

  setTimeout(() => {
    loading = false;
  }, 7000);
}

function draw() {
  // Flips the camera and draws a photo of it
  translate(innerWidth, 0);
  scale(-1, 1);
  //-----For testing with camera----- 
  //image(video, 0, 0, innerWidth, innerHeight);

  if (hands.length > 0) {
    let middle = hands[0].middle_finger_tip;
    let index = hands[0].index_finger_tip;
    let thumb = hands[0].thumb_tip;

    if (dist(middle.x, middle.y, thumb.x, thumb.y) < 70) {
      let centerX = (index.x + thumb.x) / 2;
      let centerY = (index.y + thumb.y) / 2;

      let distance = dist(index.x, index.y, thumb.x, thumb.y);

      noStroke();
      fill("blue");
      ellipse(centerX, centerY, distance);
    }
  }
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
    let graphicCanvas = overlay.createCanvas(innerWidth, innerHeight);
    graphicCanvas.position(0, 0);
  }
  overlay.draw = function () {
    overlay.clear();
    overlay.translate(innerWidth, 0);
    overlay.scale(-1, 1);

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

    if (loading) {
      overlay.push();
      overlay.translate(innerWidth, 0);
      overlay.scale(-1, 1);
      overlay.fill(0);
      overlay.rect(0, 0, innerWidth, innerHeight);
      overlay.textSize(48);
      overlay.fill(255);
      overlay.text("loading...", 100, 100);
      overlay.pop();
    }
  }
};
new p5(overlay);