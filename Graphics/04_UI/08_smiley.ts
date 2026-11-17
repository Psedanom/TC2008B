/*
 * Script to draw a 2D smiley face, and apply trasnformations to it
 *
 * Pablo Sedano
 * 11/16/2026
 */

'use strict';

import * as twgl from 'twgl-base.js';
import GUI from 'lil-gui';
import { diamond, shapeF_centered, smiley } from '../libs/shapes.js';
import { V2, M3, type Vec2, type Mat3 } from '../libs/2d-lib.js';
import { Scene } from '../libs/scene.js';
import { type Color } from '../libs/color.js';

// Import the shaders from external files
import vsGLSL from './vs_matrices_vcolor.glsl?raw';
import fsGLSL from './fs_vertex_color.glsl?raw';

// Options for the drop-down menu that selects the order of the transformations
const TRANSFORM_ORDER = [
    'scale -> rotation -> translation',
    'scale -> translation -> rotation',
    'translation -> scale -> rotation',
    'rotation -> translation -> scale',
    'rotation -> scale -> translation',
];

/*
 * Subclass of Scene with the particular objects and settings for this example.
 * Specifies the objects that will be used, and the UI operations available.
 */
class RotationScene extends Scene {
    // Selected order of the transformations (changed from the GUI)
    settings = { order: 'scale -> translation -> rotation' };

    // Matrix that accumulates the transformations of the model
    modelTransforms: Mat3 = M3.identity();

    constructor(gl: WebGL2RenderingContext) {
        super(gl, vsGLSL, fsGLSL);

        // Create the objects for this scene
        const model = this.addObject('model', smiley(150),
            [ Math.random(), Math.random(), Math.random(), 1 ]);
        model.transforms.t.x = gl.canvas.width / 2;
        model.transforms.t.y = gl.canvas.height / 2;

        const pivot = this.addObject('pivot', diamond(30),
            [ 0.6, 0.6, 0.6, 1]);
        pivot.transforms.t.x = gl.canvas.width / 2;
        pivot.transforms.t.y = gl.canvas.height / 2;
    }

    // Transformations for later use

    // Move the face to the position chosen in the GUI
    translate() {
        const model = this.getObject('model');
        const v2_trans: Vec2 = V2.create(model.transforms.t.x, model.transforms.t.y);
        this.modelTransforms = M3.multiply(M3.translation(v2_trans), this.modelTransforms);
    }

    // Scale the face by the factors chosen in the GUI
    scale() {
        const model = this.getObject('model');
        const v2_scale: Vec2 = V2.create(model.transforms.s.x, model.transforms.s.y);
        this.modelTransforms = M3.multiply(M3.scale(v2_scale), this.modelTransforms);
    }

    // Rotate the face around the origin of the world
    rotate() {
        const model = this.getObject('model');
        this.modelTransforms = M3.multiply(M3.rotation(model.transforms.rr.z), this.modelTransforms);
    }

    // Rotate the face around the pivot:
    // move the pivot to the origin, rotate, and move the pivot back
    rotateAroundPivot() {
        const pivot = this.getObject('pivot');
        const v2_pivot_to_center: Vec2 = V2.create(-pivot.transforms.t.x, -pivot.transforms.t.y);
        const v2_center_to_pivot: Vec2 = V2.create(pivot.transforms.t.x, pivot.transforms.t.y);

        this.modelTransforms = M3.multiply(M3.translation(v2_pivot_to_center), this.modelTransforms);
        this.rotate();
        this.modelTransforms = M3.multiply(M3.translation(v2_center_to_pivot), this.modelTransforms);
    }

    // Orders of the transformations functions

    scaleRotateTranslate() {
        this.modelTransforms = M3.identity();
        this.scale();
        this.rotateAroundPivot();
        this.translate();
    }

    scaleTranslateRotate() {
        this.modelTransforms = M3.identity();
        this.scale();
        this.translate();
        this.rotateAroundPivot();
    }

    translateScaleRotate() {
        this.modelTransforms = M3.identity();
        this.translate();
        this.scale();
        this.rotateAroundPivot();
    }

    rotateTranslateScale() {
        this.modelTransforms = M3.identity();
        this.rotateAroundPivot();
        this.translate();
        this.scale();
    }

    rotateScaleTranslate() {
        this.modelTransforms = M3.identity();
        this.rotateAroundPivot();
        this.scale();
        this.translate();
    }

    // Method to draw the scene.
    protected render(): void {
        const { gl, programInfo } = this;
        const model = this.getObject('model');
        const pivot = this.getObject('pivot');

        // Vector to translate the pivot back to its original position
        const v2_center_to_pivot: Vec2 = V2.create(pivot.transforms.t.x,
                                                   pivot.transforms.t.y);

        // Build the model matrix in the order selected in the GUI
        switch (this.settings.order) {
            case 'scale -> rotation -> translation':
                this.scaleRotateTranslate();
                break;
            case 'scale -> translation -> rotation':
                this.scaleTranslateRotate();
                break;
            case 'translation -> scale -> rotation':
                this.translateScaleRotate();
                break;
            case 'rotation -> translation -> scale':
                this.rotateTranslateScale();
                break;
            case 'rotation -> scale -> translation':
                this.rotateScaleTranslate();
                break;
            default:
                this.scaleTranslateRotate();
                break;
        }

        gl.useProgram(programInfo.program);

        let uniforms = {
            u_resolution: [gl.canvas.width, gl.canvas.height],
            u_transforms: this.modelTransforms,
            u_color: model.color,
        };
        twgl.setUniforms(programInfo, uniforms);
        gl.bindVertexArray(model.vao);
        twgl.drawBufferInfo(gl, model.bufferInfo);

        // Transform matrices for the pivot
        const translateMatrixPivot: Mat3 = M3.translation(v2_center_to_pivot);

        // Composite transform matrix for the pivot (only translation)
        let pivotTransforms: Mat3 = M3.identity();
        pivotTransforms = M3.multiply(translateMatrixPivot, pivotTransforms);

        uniforms = {
            u_resolution: [gl.canvas.width, gl.canvas.height],
            u_transforms: pivotTransforms,
            u_color: pivot.color,
        };
        twgl.setUniforms(programInfo, uniforms);
        gl.bindVertexArray(pivot.vao);
        twgl.drawBufferInfo(gl, pivot.bufferInfo);
    }

    setupUI(): void {
        const { gl } = this;
        const model = this.getObject('model');
        const pivot = this.getObject('pivot');

        const gui = new GUI();

        // Drop-down menu to choose the order of the transformations
        gui.add(this.settings, 'order', TRANSFORM_ORDER).name('Transform order');

        const modelFolder = gui.addFolder('Model');

        const traFolder = modelFolder.addFolder('Translation');
        traFolder.add(model.transforms.t, 'x', 0, gl.canvas.width)
            .onChange((value: number) => {
                model.transforms.t.x = value;
            });
        traFolder.add(model.transforms.t, 'y', 0, gl.canvas.height)
            .onChange((value: number) => {
                model.transforms.t.y = value;
            });

        const rotFolder = modelFolder.addFolder('Rotation');
        rotFolder.add(model.transforms.rr, 'z', 0, Math.PI * 2)
            .onChange((value: number) => {
                model.transforms.rr.z = value;
            });

        const scaFolder = modelFolder.addFolder('Scale');
        scaFolder.add(model.transforms.s, 'x', -5, 5)
            .onChange((value: number) => {
                model.transforms.s.x = value;
            });
        scaFolder.add(model.transforms.s, 'y', -5, 5)
            .onChange((value: number) => {
                model.transforms.s.y = value;
            });

        // const colorFolder = modelFolder.addFolder('Color');
        // colorFolder.addColor(model, 'color')
        //     .onChange((value: Color) => {
        //         model.color = value;
        //     });

        const pivotFolder = gui.addFolder('Pivot');
        const pivotTraFolder = pivotFolder.addFolder('Translation');
        pivotTraFolder.add(pivot.transforms.t, 'x', 0, gl.canvas.width)
            .onChange((value: number) => {
                pivot.transforms.t.x = value;
            });
        pivotTraFolder.add(pivot.transforms.t, 'y', 0, gl.canvas.height)
            .onChange((value: number) => {
                pivot.transforms.t.y = value;
            });
    }
}

/*
 * Main function to initialize the WebGL context, create the scene, and set up the UI.
 */
function main(): void {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
        throw new Error('No canvas element found in the document');
    }

    const gl = canvas.getContext('webgl2');
    if (!gl) {
        throw new Error('WebGL2 is not supported by this browser');
    }

    const scene = new RotationScene(gl);
    scene.setupUI();
    scene.draw(0);
}

main()
