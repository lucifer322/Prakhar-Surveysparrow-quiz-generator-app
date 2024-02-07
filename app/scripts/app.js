var client;

init();

async function init() {
  client = await window.app.initialized();
}

const API_BASE_URL = "https://api.surveysparrow.com/v3/";
const headers = {
  options: {
    headers: {
      Authorization: `Bearer <%= iparams.surveysparrow_api_key %>`,
    },
  },
};

let quizName, file, questions
const button = document.getElementById("btn");
const message = document.getElementById("msg");

function validateForm() {
  let surveyName = document.getElementById('surveyName').value;
  let fileInput = document.getElementById('fileInput');

  if (surveyName.trim() === '') {
    // alert('Please enter a Quiz Name.');
    return;
  }

  if (fileInput.files.length === 0) {
    // alert('Please select a file.');
    return;
  }

  quizName = surveyName;
  file = fileInput.files[0];
  document.querySelector('form').reset()
  console.log('Form Validated')
  readCSVFile(file,quizName)
  createSurvey()
}

function readCSVFile(file, quizName) {
  const fileReader = new FileReader();
  fileReader.onload = function (event) {
    const fileContent = event.target.result;
    console.log('Quiz Name:', quizName);
    console.log('File Content:', fileContent);
    const parsedCSV = Papa.parse(fileContent, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true, 
    }).data;
    console.log('ParsedCSV')
    console.log(parsedCSV)
    generateQuestions(parsedCSV)
    
  };
  fileReader.readAsText(file);
}

function generateQuestions(csvData) {
  const surveyQuestions = [];

  // Iterate through each row in the CSV data
  csvData.forEach(row => {
    const question = row.Question;
    const correctOptions = row.Correct_Option.split('_').map(option => option.trim());
    const choices = [];

    // Determine the number of options dynamically by iterating over the row keys
    Object.keys(row).forEach(key => {
      if (key.startsWith('Option_')) {
        const optionText = row[key];
        const isCorrectOption = correctOptions.includes(optionText.trim());
        const score = isCorrectOption ? 1 : (correctOptions.length > 1 ? -1 : 0);

        if (optionText.trim() !== '') {
          const choice = {
            text: optionText,
            score: score,
          };
          choices.push(choice);
        }
      }
    });

    const surveyQuestion = {
      text: question,
      type: "MultiChoice",
      required: true,
      hasScore: true,
      multiple_answers: correctOptions.length > 1,
      choices: choices,
    };

    surveyQuestions.push(surveyQuestion);
  });
  questions = surveyQuestions;
}

async function createSurvey() {
    try {
      button.innerHTML = "Your Survey is being created...";
      // Create the Survey
      const surveyId = await postSurvey();
      for (let question of questions) {
        await postQuestion(surveyId, question);
      }
      console.log('Survey created successfully!');
      button.innerHTML = "Create";
      showNotificationMessage("Survey Created Successfully", { type: "success" });
    } catch (error) {
      console.log("Error while creating the Survey", error);
    }
  }

async function postSurvey() {
  const response = await client.request.post(`${API_BASE_URL}surveys`, headers, {
    name: quizName,
    survey_type: "ClassicForm",
  });
  return JSON.parse(response).body.data.id;
}
  
async function postQuestion(surveyId, question) {
  try{
    await client.request.post(`${API_BASE_URL}questions`, headers, {
      survey_id: surveyId,
      question:question
    });
    console.log('Question Posted successfully!');
  } catch(error){
  console.log("Error while creating the Survey", error);
}
}

function showNotificationMessage(message, options) {
  client.interface.alertMessage(message, options);
  if (options.type === "success") {
    message.innerHTML = "Please navigate to home screen to see newly created Survey.";
    setTimeout(() => {
      message.innerHTML = "";
    }, 3000);
  }
}

