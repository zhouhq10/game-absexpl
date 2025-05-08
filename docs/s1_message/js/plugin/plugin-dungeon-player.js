var jsPsychDungeonPlayerGivenMessage = (function (jspsych) {
  "use strict";
  const info = {
      name: 'dungeon-player-given-message',
      parameters: {
        instructions: {
            type: jspsych.ParameterType.STRING,
            default: "",
            description: 'HTML or text instructions shown before the game'
        },
        button_label: {
            type: jspsych.ParameterType.STRING,
            default: 'Noted',
            description: 'Label for the start button'
        },
        config: {
            type: jspsych.ParameterType.OBJECT,
            default: {},
            description: 'Phaser.Game configuration object'
        }
      }
  };

  /**
   * **DUNGEON-PLAYER-GIVEN-MESSAGE**
   *
   * A jsPsych plugin for a dungeon player trial after reading a message
   *
   * @author [Hanqi Zhou]
   */
  class DungeonPlayerGivenMessagePlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      const trial_start = Date.now();
      // const sequence_uuid = UUID();

      // Show instructions and start button
      var html = '<div id="jspsych-phaser-instructions">' + 'Here is the message your teacher sent you:' + '</div>';
      // some empty space between the instructions and the message
      html += '<div style="height: 20px;"></div>';
      html += '<div style="border: 2px solid #4CAF50; background-color: #f9fff9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">';
      html += '<p style="font-weight: bold; font-size: 1.2em; margin-top: 0;">' + trial.instructions + '</p>';
      html += '</div>';

      html += '<div style="width: 100%; height: 50px; margin-top: 20px;">';

      // Add the continue button, hidden and disabled by default
      html += '<button class="jspsych-btn" id="jspsych-phaser-start">' + trial.button_label + '</button>';
      display_element.innerHTML = html;

      display_element.querySelector('#jspsych-phaser-start').addEventListener('click', function() {
        // Clear instructions
        display_element.innerHTML = '<div id="phaser-container"></div>';

        // Create the Phaser game
        let container = document.createElement('div');
        container.id = 'phaser-container';
        display_element.appendChild(container);
        
        trial.config.parent = 'phaser-container';
        trial.config.width = 600;
        trial.config.height = 400;
        trial.config.scene = new DungeonScene(roomTest1Config);
        const game = new Phaser.Game(trial.config);

        // When the game dispatches 'GAME_OVER', finish the trial
        // Attach the event listener for the custom event
        function playerReachedStairs() {
          const scene = game.scene.getAt(0);
          if (scene && scene.events) {
              scene.events.on('hasPlayerReachedStairs', () => {
                console.log('hasPlayerReachedStairs');
                const trial_end = Date.now();

                var trial_data = {
                  // sequence_uuid: sequence_uuid,
                  trajectory: game.scene.playerTrajectory,
                  trial_start: trial_start,
                  trial_end: trial_end,
                };
                display_element.innerHTML = '<div>Success!</div><button class="jspsych-btn" id="jspsych-phaser-continue">Continue</button>';

                display_element.querySelector('#jspsych-phaser-continue').addEventListener('click', () => {
                  display_element.innerHTML = '';
                  this.jsPsych.finishTrial(trial_data);
                  game.destroy(true);
                });
              });
          } else {
              setTimeout(playerReachedStairs, 50);
          }
        }
        playerReachedStairs();

      });
    }
  }
  DungeonPlayerGivenMessagePlugin.info = info;
  return DungeonPlayerGivenMessagePlugin;

})(jsPsychModule);