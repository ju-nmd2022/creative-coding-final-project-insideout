let color;

function setup() {
    createCanvas(800, 800, WEBGL);
    background("#fffceb");

    // Idk if we need this but ¯\_(ツ)_/¯
    brush.load();

    // For performance, DONT REMOVE!!!!
    brush.reDraw();

    // Brushes
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
            curve: [0.35, 0.25]
        },
        tip: (_m) => {
            _m.rotate(45), _m.rect(-1.5, -1.5, 3, 3), _m.rect(1, 1, 1, 1);
        },
        rotate: "natural",
    })

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
            curve: [0.35, 0.25]
        },
        tip: (_m) => {
            _m.rotate(45), _m.rect(-1.5, -1.5, 3, 3), _m.rect(1, 1, 1, 1);
        },
        rotate: "natural",
    })

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
            curve: [0.35, 0.25]
        },
        tip: (_m) => {
            _m.rotate(45), _m.rect(-1.5, -1.5, 3, 3), _m.rect(1, 1, 1, 1);
        },
        rotate: "natural",
    })

    happy();
    brush.noHatch();
    brush.noField();
    brush.noStroke();
}

function drawing() {
    // 0, 0 is the center of the canvas, so we calculate the x and y
    let x = mouseX - (width / 2);
    let y = mouseY - (height / 2);

    // Randomness :)
    brush.bleed(0.3, "out");
    brush.fillTexture(0.6, 0.4);
    brush.fill(color, 80);
    brush.rect(x, y, 100, 100);
}

function happy() {
    brush.pick("happy");
    color = "#ffba59";
}

function sad() {
    brush.pick("sad");
    color = "#002185";
}

function angry() {
    brush.pick("angry");
    color = "#9c1012";
}

function draw() {
    if (mouseIsPressed) {
        drawing();
    }
}