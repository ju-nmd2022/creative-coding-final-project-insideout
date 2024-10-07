let color;

function setup() {
    createCanvas(800, 800, WEBGL);
    background("#fffceb");

    // Idk if we need this but ¯\_(ツ)_/¯
    brush.load();

    // For performance, DONT REMOVE!!!!
    brush.reDraw();

    // Start/Default emotion
    happy();

    // Unchanged brush settings
    brush.noHatch();
    brush.noField();
    brush.noStroke();
}

function drawing() {
    // 0, 0 is the center of the canvas, so we calculate the x and y
    let x = mouseX - (width / 2);
    let y = mouseY - (height / 2);

    // Randomness :)
    brush.bleed(random(0.05, 0.4));
    brush.fillTexture(0.55, 0.5);
    brush.fill(color, random(80, 140));
    brush.rect(x, y, 100, 100);
}

function happy() {
    color = "#ffba59";
}

function sad() {
    color = "#002185";
}

function angry() {
    color = "#9c1012";
}

function draw() {
    if (mouseIsPressed) {
        drawing();
    }
}