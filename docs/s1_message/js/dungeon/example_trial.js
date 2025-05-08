var dungeonExample = (function (jspsych) {
    'use strict';
  
    const info = {
        name: "dungeon-example",
        parameters: {
            trial: {
                type: jspsych.ParameterType.STRING,
                pretty_name: "Trial",
                default: null
            },
            title: {
                type: jspsych.ParameterType.STRING,
                pretty_name: "Title",
                default: ''
            },
            mission: {
                type: jspsych.ParameterType.STRING,
                pretty_name: "Mission",
                default: ''
            },
            config: {
                type: jspsych.ParameterType.OBJECT,
                pretty_name: "Config",
                default: {}
            },
        },
    };
    /**
     * 
     *
     * @author Hanqi Zhou
     */
    class DungeonExamplePlugin {
        constructor(jsPsych) {
            this.jsPsych = jsPsych;
        }
  
        trial(display_element, trial) {
            // half of the thumb width value from jspsych.css, used to adjust the label positions
            var half_thumb_width = 7.5;
            var html = '<div id="jspsych-html-slider-response-wrapper"';
            if (trial.extra_text == '') {
                html += 'style="margin-top: 50px;"';
            }
            html += '>';
            
            // build HTML: title, mission, game container, and button hidden until game end
            html += '<div id="jspsych-html-slider-response-stimulus" style="width: 1000px;">';
            html += '<h3>' + trial.title + '</h3>';
            html += '<p style="margin-bottom: 0px;"><b>' + trial.mission + '</b></p>';
            html += '<div style="width: 100%; height: 50px; margin-top: 20px;">';

            // // Add the continue button, hidden and disabled by default
            // display buttons
            html += '<div id="jspsych-html-button-response-btngroup" style="visibility: hidden;">';
            html += '<div class="jspsych-html-button-response-button" style="display:' +
                'inline-block; margin: 0px 8px;" id="jspsych-html-button-response-button-0' +
                '" data-choice="0"> <button class="jspsych-btn" style="margin: 0 1em 2em;">' +
                ' Continue </button>';
            html += '</div> </div>';

            // Set the HTML
            display_element.innerHTML = html;

            // Create the Phaser game
            let container = document.createElement('div');
            container.id = 'phaser-container';
            display_element.appendChild(container);
            
            trial.config.parent = 'phaser-container';
            trial.config.width = 600;
            trial.config.height = 400;
            trial.config.scene = new DungeonScene(trial.config.scene_name);
            const game = new Phaser.Game(trial.config);

            // Attach the event listener for the custom event
            function attachStairsListener() {
                const scene = game.scene.getAt(0);
                if (scene && scene.events) {
                    scene.events.on('hasPlayerReachedStairs', () => {
                        const btnGroup = display_element.querySelector('#jspsych-html-button-response-btngroup');
                        if (btnGroup) btnGroup.style.visibility = 'visible';
                        const button = display_element.querySelector('#jspsych-html-button-response-button-0');
                        if (button) button.disabled = false;
                    });
                } else {
                    setTimeout(attachStairsListener, 50);
                }
            }
            attachStairsListener();

            // add event listeners to buttons
            display_element
                .querySelector("#jspsych-html-button-response-button-0")
                .addEventListener("click", (e) => {
                game.destroy(true);
                end_trial();
                // var btn_el = e.currentTarget;
                // var choice = btn_el.getAttribute("data-choice"); // don't use dataset for jsdom compatibility
                // after_response(choice);
            });
  
            const end_trial = () => {
                this.jsPsych.pluginAPI.clearAllTimeouts();
                // save data
                var trialdata = {
                    trial: trial.trial,
                    // response: response.button,
                    
                };
                display_element.innerHTML = "";
                // next trial
                this.jsPsych.finishTrial(trialdata);
            };
            
            // function to handle responses by the subject
            function after_response(choice) {
                response.button = parseInt(choice);
                // disable all the buttons after a response
                var btns = document.querySelectorAll(".jspsych-html-button-response-button button");
                for (var i = 0; i < btns.length; i++) {
                    //btns[i].removeEventListener('click');
                    btns[i].setAttribute("disabled", "disabled");
                }
                end_trial();
            }
        }
  
        simulate(trial, simulation_mode, simulation_options, load_callback) {
            if (simulation_mode == "data-only") {
                load_callback();
                this.simulate_data_only(trial, simulation_options);
            }
            if (simulation_mode == "visual") {
                this.simulate_visual(trial, simulation_options, load_callback);
            }
        }
  
        create_simulation_data(trial, simulation_options) {
            const default_data = {
                response: this.jsPsych.randomization.randomInt(0, trial.choices.length - 1),
                rt: this.jsPsych.randomization.sampleExGaussian(500, 50, 1 / 150, true),
            };
            const data = this.jsPsych.pluginAPI.mergeSimulationData(default_data, simulation_options);
            this.jsPsych.pluginAPI.ensureSimulationDataConsistency(trial, data);
            return data;
        }
  
        simulate_data_only(trial, simulation_options) {
            const data = this.create_simulation_data(trial, simulation_options);
            this.jsPsych.finishTrial(data);
        }
        simulate_visual(trial, simulation_options, load_callback) {
            const data = this.create_simulation_data(trial, simulation_options);
            const display_element = this.jsPsych.getDisplayElement();
            this.trial(display_element, trial);
            load_callback();
            if (data.rt !== null) {
                const el = display_element.querySelector("input[type='range']");
                setTimeout(() => {
                    this.jsPsych.pluginAPI.clickTarget(el);
                    el.valueAsNumber = data.response;
                }, data.rt / 2);
                this.jsPsych.pluginAPI.clickTarget(display_element.querySelector("button"), data.rt);
            }
        }
    }
  
    DungeonExamplePlugin.info = info;
  
    return DungeonExamplePlugin;
  
  })(jsPsychModule);