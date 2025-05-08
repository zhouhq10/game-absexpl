// import DungeonScene from "./dungeon/dungeon-scene.js";

// !! Trial 
var trial_info1 = [
    {
        "trial": "snack1",
        "num": 1,
        "mission": "Who got a snack from the fridge?",
        "a_type": "A",
        "b_type": "B",
        "audio_clue": false,
        "visual_clue": true
    },
    {
        "trial": "snack2",
        "num": 2,
        "mission": "Who got a snack from the fridge?",
        "a_type": "C",
        "b_type": "D",
        "audio_clue": true,
        "visual_clue": true
    },
    {
        "trial": "snack3",
        "num": 3,
        "mission": "Who got a snack from the fridge?",
        "a_type": "E",
        "b_type": "F",
        "audio_clue": true,
        "visual_clue": false
    },
    {
        "trial": "snack4",
        "num": 4,
        "mission": "Who got a snack from the fridge?",
        "a_type": "A",
        "b_type": "D",
        "audio_clue": false,
        "visual_clue": true
    },
    {
        "trial": "snack5",
        "num": 5,
        "mission": "Who got a snack from the fridge?",
        "a_type": "B",
        "b_type": "E",
        "audio_clue": true,
        "visual_clue": true
    },
    {
        "trial": "snack6",
        "num": 6,
        "mission": "Who got a snack from the fridge?",
        "a_type": "C",
        "b_type": "F",
        "audio_clue": true,
        "visual_clue": false
    },
    {
        "trial": "snack7",
        "num": 7,
        "mission": "Who got a snack from the fridge?",
        "a_type": "A",
        "b_type": "C",
        "audio_clue": false,
        "visual_clue": true
    },
    {
        "trial": "snack8",
        "num": 8,
        "mission": "Who got a snack from the fridge?",
        "a_type": "B",
        "b_type": "D",
        "audio_clue": true,
        "visual_clue": true
    },
    {
        "trial": "snack9",
        "num": 9,
        "mission": "Who got a snack from the fridge?",
        "a_type": "C",
        "b_type": "F",
        "audio_clue": true,
        "visual_clue": false
    },
    {
        "trial": "snack10",
        "num": 10,
        "mission": "Who got a snack from the fridge?",
        "a_type": "D",
        "b_type": "E",
        "audio_clue": false,
        "visual_clue": true
    },
    {
        "trial": "snack11",
        "num": 11,
        "mission": "Who got a snack from the fridge?",
        "a_type": "A",
        "b_type": "E",
        "audio_clue": true,
        "visual_clue": true
    },
    {
        "trial": "snack12",
        "num": 12,
        "mission": "Who got a snack from the fridge?",
        "a_type": "C",
        "b_type": "F",
        "audio_clue": true,
        "visual_clue": false
    },
    {
        "trial": "snack13",
        "num": 13,
        "mission": "Who got a snack from the fridge?",
        "a_type": "B",
        "b_type": "F",
        "audio_clue": false,
        "visual_clue": true
    },
    {
        "trial": "tv1",
        "num": 14,
        "mission": "Who was watching TV?",
        "a_type": "E",
        "b_type": "F",
        "audio_clue": true,
        "visual_clue": true
    },
    {
        "trial": "tv2",
        "num": 15,
        "mission": "Who was watching TV?",
        "a_type": "A",
        "b_type": "D",
        "audio_clue": true,
        "visual_clue": false
    },
    {
        "trial": "tv3",
        "num": 16,
        "mission": "Who was watching TV?",
        "a_type": "B",
        "b_type": "C",
        "audio_clue": false,
        "visual_clue": true
    },
    {
        "trial": "tv4",
        "num": 17,
        "mission": "Who was watching TV?",
        "a_type": "C",
        "b_type": "E",
        "audio_clue": true,
        "visual_clue": true
    },
    {
        "trial": "tv5",
        "num": 18,
        "mission": "Who was watching TV?",
        "a_type": "B",
        "b_type": "F",
        "audio_clue": true,
        "visual_clue": false
    },
    {
        "trial": "tv6",
        "num": 19,
        "mission": "Who was watching TV?",
        "a_type": "A",
        "b_type": "E",
        "audio_clue": false,
        "visual_clue": true
    },
    {
        "trial": "tv7",
        "num": 20,
        "mission": "Who was watching TV?",
        "a_type": "B",
        "b_type": "D",
        "audio_clue": true,
        "visual_clue": true
    }
];


var starter = '<div style="height: 443px; text-align: center;">';
var end_starter = '</div>'
var narrow_div = '<div style="max-width: 600px; margin: 6em auto 2em;"';
var end_narrow_div = '</div>';


// Welcome
var page1 =
    '<h2>' + 'Welcome, Treasure Hunter!' + '</h2>' + 
    '<p>' + 
        'You are the <b>Navigator</b>, exploring a mysterious dungeon, looking for its secrets.' +
    '</p>' +
    '<div style="text-align: center; margin: 20px 0;">' +
        '<img src="assets/images/wholeWorld.png" style="max-width: 600px; ">' +
        '<p style="font-size: 0.9em; color: #666;">An example of what the dungeon might look like</p>' +
    '</div>' +
    '<p>' + 
        'Your partner, the <b>Seeker</b> <img src="assets/images/agent.gif" style="max-width: 200px;">, is inside the maze but can only see a tiny area around them.' + 
        ' They rely entirely on your guidance to find their way.' +
    '</p>' +  
    // '<div style="text-align: center; margin: 20px 0;">' +
    //     '<img src="assets/images/agent.gif" style="max-width: 200px;">' +
    // '</div>' +
    '<p>' + 
        '<strong>Your mission:</strong> Explore the full dungeon, chart the best path, and lead your partner to the hidden treasure.' +
    '</p>';



// Practice overview
var page2 =
    '<h2>' + 'How This Works' + '</h2>' + 
    '<p>' + 
        'You’ll go through two kinds of trials to prepare for your mission:' +
    '</p>' +
    '<ol>' + 
        '<li><b>Practice Trials</b> – Try navigating (with Up, Down, Left, Right keys) a few sample maps just like your Seeker, with limited vision.</li>' +
        '<li><b>Explanation Trials</b> – Look at a new full map, then write clear messages to guide your Seeker to the treasure.</li>' +
    '</ol>' +
    '<p>' + 
        'Let’s start with a practice run!' + 
    '</p>';


var page3 =
    '<h2>' + 'Quick Check' + '</h2>' + 
    '<p>' + 
        'Ready to begin your quest?' + 
    '</p>' +
    '<p>' +
        'When you’re ready to start exploring, press <b>Next</b>.' +
    '</p>';

var instruction_pages = [
    page1,
    page2,
    page3
];


// !! Example Trials !!
example_trial_info = [
    {
        trial: 'example1',
        title: 'Example Map 1',
        mission: 'Could you try to find the treasure? (use Up, Down, Left, Right keys)',
        config: {
            type: Phaser.AUTO,
            width: 800,
            height: 800,
            backgroundColor: "#000",
            parent: "game-container",
            pixelArt: true,
            scene_name: roomPredefinedExample1,
            physics: {
              default: "arcade",
              arcade: {
                gravity: { y: 0 },
              },
            },
          }
    },
    {
        trial: 'example2',
        title: 'Example Map 2',
        mission: 'Could you try to find the treasure? (use Up, Down, Left, Right keys)' ,
        config: {
            type: Phaser.AUTO,
            width: 800,
            height: 800,
            backgroundColor: "#000",
            parent: "game-container",
            pixelArt: true,
            scene_name: roomPredefinedExample2,
            physics: {
                default: "arcade",
                arcade: {
                gravity: { y: 0 },
                },
            },
            }
    }
];

var instructions_last_page =
    narrow_div +
        '<p>' +
            "Nice work!" +
        '</p>' +
        '<p>' +
            "In this experiment, " +
            "</br>you'll be given a map of the dungeon." +
            "</br>Your job is to figure out what to write in a message to help your partner, the seeker, reach the treasure as quickly as possible." +
        '</p>' +
        '<p>' +
            "One the next page, there are several questions about the instructions. " +
            '</br>Please answer them carefully before starting the experiment.' +
        '</p>' +
    end_narrow_div;

var comprehension1 =
    '<p>' +
        'In every trial, you will be asked to play the game and find the treasure.' +
    '</p>';
var options1 = ['True', 'False']

var comprehension2 =
    '<p>' +
        'In every trial, you will be shown what the whole dungeon looked like while your seeker does not know the complete map.' +
    '</p>';
var options2 = ['True', 'False']

var comprehension3 =
    '<p>' +
        'In every trial, you want to write a message that helps your seeker reach the treasure as quickly as possible.' +
    '</p>';
var options3 = ['True', 'False'];

var start_prompt =
    narrow_div +
        '<p>' +
            'Correct! On the next page, the experiment will begin.' +
        '</p>' +
        '<p>' +
            'Make sure you are fully prepared for your seeker.' +
        '</p>' +
        '<p>' +
            'Please do not refresh the page or you may not be credited correctly.' +
        '</p>' +
        '<p>' +
            "Click the <b>Start</b> button whenever you're ready." +
        '</p>' +
    end_narrow_div;