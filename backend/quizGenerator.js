import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

// Comprehensive fallback questions bank for all genres & difficulties
const FALLBACK_BANK = {
  Sports: {
    easy: [
      { question: "How many players are on the field for one team in a standard soccer match?", options: ["9", "10", "11", "12"], correctAnswerIndex: 2, explanation: "A standard soccer team has 11 players on the field including the goalkeeper." },
      { question: "In basketball, how many points is a shot taken from behind the arc worth?", options: ["1 Point", "2 Points", "3 Points", "4 Points"], correctAnswerIndex: 2, explanation: "Shots taken beyond the three-point line are worth 3 points." },
      { question: "Which sport is known as 'America's Pastime'?", options: ["Baseball", "American Football", "Basketball", "Ice Hockey"], correctAnswerIndex: 0, explanation: "Baseball has historically been called America's national pastime." },
      { question: "How long is a standard marathon race?", options: ["21.1 km (13.1 miles)", "42.195 km (26.2 miles)", "50 km (31 miles)", "10 km (6.2 miles)"], correctAnswerIndex: 1, explanation: "A standard marathon is 42.195 kilometers or 26.2 miles long." },
      { question: "In tennis, what term is used to describe a score of zero?", options: ["Nil", "Zero", "Love", "Duck"], correctAnswerIndex: 2, explanation: "In tennis scoring, 'love' means a score of zero." }
    ],
    medium: [
      { question: "Which country won the FIFA World Cup in 2018?", options: ["Brazil", "Croatia", "France", "Germany"], correctAnswerIndex: 2, explanation: "France won the 2018 FIFA World Cup beating Croatia 4-2 in the final." },
      { question: "What is the maximum break achievable in a standard game of Snooker?", options: ["147", "155", "140", "180"], correctAnswerIndex: 0, explanation: "A standard maximum break in snooker is 147 points." },
      { question: "How many Grand Slam singles titles has Serena Williams won?", options: ["20", "22", "23", "25"], correctAnswerIndex: 2, explanation: "Serena Williams won 23 Open Era Grand Slam singles titles." },
      { question: "In Cricket, what is the distance between the two sets of wickets?", options: ["20 yards", "22 yards", "24 yards", "18 yards"], correctAnswerIndex: 1, explanation: "The cricket pitch length between wickets is 22 yards (66 feet)." },
      { question: "Which NBA team has the most championships in history?", options: ["Los Angeles Lakers", "Boston Celtics", "Golden State Warriors", "Tied: Celtics & Lakers"], correctAnswerIndex: 3, explanation: "As of 2024, Boston Celtics lead with 18, while LA Lakers have 17 championships." }
    ],
    hard: [
      { question: "In Olympic Archery, what is the diameter of the 10-ring target center?", options: ["8 cm", "12.2 cm", "15 cm", "10 cm"], correctAnswerIndex: 1, explanation: "The 10-ring center circle in outdoor target archery measures 12.2 cm across at 70m distance." },
      { question: "Who was the first athlete to run a sub-4-minute mile?", options: ["Roger Bannister", "John Landy", "Steve Prefontaine", "Paavo Nurmi"], correctAnswerIndex: 0, explanation: "Sir Roger Bannister ran the first sub-4-minute mile on May 6, 1954." },
      { question: "In Formula 1, which circuit has the highest number of laps per race?", options: ["Monaco Grand Prix", "Monza", "Silverstone", "Spa-Francorchamps"], correctAnswerIndex: 0, explanation: "The Monaco GP has 78 laps due to its short circuit length of 3.337 km." },
      { question: "Which country hosted the first official Winter Olympic Games in 1924?", options: ["Switzerland", "France (Chamonix)", "Norway", "United States"], correctAnswerIndex: 1, explanation: "The inaugural 1924 Winter Olympics were held in Chamonix, France." },
      { question: "In Golf, what is the rare score of 3 strokes under par on a single hole called?", options: ["Eagle", "Albatross (Double Eagle)", "Condor", "Birdie"], correctAnswerIndex: 1, explanation: "An Albatross (or Double Eagle) is 3 strokes under par on a single hole." }
    ]
  },
  History: {
    easy: [
      { question: "Who was the first President of the United States?", options: ["Thomas Jefferson", "George Washington", "Abraham Lincoln", "John Adams"], correctAnswerIndex: 1, explanation: "George Washington served as the 1st President of the US from 1789 to 1797." },
      { question: "In which year did World War II end?", options: ["1918", "1939", "1945", "1950"], correctAnswerIndex: 2, explanation: "World War II officially ended in September 1945." },
      { question: "Which ancient civilization built the Great Pyramids of Giza?", options: ["Romans", "Greeks", "Egyptians", "Mayans"], correctAnswerIndex: 2, explanation: "The Ancient Egyptians constructed the Great Pyramids at Giza." },
      { question: "Who was known as the 'Iron Lady' of British Politics?", options: ["Queen Elizabeth II", "Margaret Thatcher", "Theresa May", "Florence Nightingale"], correctAnswerIndex: 1, explanation: "Margaret Thatcher was nicknamed the 'Iron Lady' for her uncompromising politics." },
      { question: "Which famous ship sank in 1912 after striking an iceberg?", options: ["Titanic", "Lusitania", "Britannic", "Mayflower"], correctAnswerIndex: 0, explanation: "The RMS Titanic sank on its maiden voyage in April 1912." }
    ],
    medium: [
      { question: "In which year did the French Revolution begin?", options: ["1776", "1789", "1799", "1812"], correctAnswerIndex: 1, explanation: "The French Revolution broke out in 1789 with the storming of the Bastille." },
      { question: "Who was the first Emperor of the Roman Empire?", options: ["Julius Caesar", "Augustus Caesar", "Nero", "Marcus Aurelius"], correctAnswerIndex: 1, explanation: "Augustus (formerly Octavian) became the first Emperor of Rome in 27 BC." },
      { question: "The Treaty of Versailles was signed in 1919 after which war?", options: ["Crimean War", "World War I", "World War II", "Franco-Prussian War"], correctAnswerIndex: 1, explanation: "The Treaty of Versailles formally concluded World War I." },
      { question: "Which empire was ruled by Genghis Khan in the 13th century?", options: ["Ottoman Empire", "Mongol Empire", "Persian Empire", "Byzantine Empire"], correctAnswerIndex: 1, explanation: "Genghis Khan founded and expanded the vast Mongol Empire." },
      { question: "Who was the Soviet leader during World War II?", options: ["Vladimir Lenin", "Joseph Stalin", "Nikita Khrushchev", "Leon Trotsky"], correctAnswerIndex: 1, explanation: "Joseph Stalin led the Soviet Union during World War II." }
    ],
    hard: [
      { question: "In which year did the Byzantine Empire fall to the Ottoman Turks?", options: ["1453", "1204", "1492", "1517"], correctAnswerIndex: 0, explanation: "Constantinople fell to Sultan Mehmed II in 1453, ending the Byzantine Empire." },
      { question: "Which English King was beheaded in 1649 following the English Civil War?", options: ["Charles I", "Charles II", "James I", "Henry VIII"], correctAnswerIndex: 0, explanation: "King Charles I was tried and executed for treason in 1649." },
      { question: "What was the name of the secret nuclear research project during WWII?", options: ["Project Apollo", "Manhattan Project", "Operation Overlord", "Project Mercury"], correctAnswerIndex: 1, explanation: "The Manhattan Project developed the first atomic weapons." },
      { question: "Which ancient battle in 490 BC saw the Athenians defeat the Persian invasion force?", options: ["Battle of Thermopylae", "Battle of Marathon", "Battle of Salamis", "Battle of Plataea"], correctAnswerIndex: 1, explanation: "The Battle of Marathon was a decisive Athenian victory over Persia in 490 BC." },
      { question: "Who was the last Tsar of the Russian Empire?", options: ["Alexander III", "Nicholas II", "Peter the Great", "Ivan the Terrible"], correctAnswerIndex: 1, explanation: "Tsar Nicholas II was the final monarch of Russia before his abdication in 1917." }
    ]
  },
  Entertainment: {
    easy: [
      { question: "Which movie won the Academy Award for Best Picture in 2024?", options: ["Barbie", "Oppenheimer", "Poor Things", "Killers of the Flower Moon"], correctAnswerIndex: 1, explanation: "Christopher Nolan's 'Oppenheimer' won Best Picture at the 96th Academy Awards." },
      { question: "What is the name of Mickey Mouse's pet dog?", options: ["Goofy", "Pluto", "Snoopy", "Buster"], correctAnswerIndex: 1, explanation: "Pluto is Mickey Mouse's loyal pet dog." },
      { question: "Which superhero is also known as Bruce Wayne?", options: ["Superman", "Spider-Man", "Batman", "Iron Man"], correctAnswerIndex: 2, explanation: "Bruce Wayne is the secret identity of Batman." },
      { question: "Who sings the hit song 'Shape of You'?", options: ["Justin Bieber", "Ed Sheeran", "Shawn Mendes", "Bruno Mars"], correctAnswerIndex: 1, explanation: "'Shape of You' was released by Ed Sheeran in 2017." },
      { question: "In 'Harry Potter', which house does Harry belong to?", options: ["Slytherin", "Ravenclaw", "Hufflepuff", "Gryffindor"], correctAnswerIndex: 3, explanation: "Harry Potter was sorted into Gryffindor house." }
    ],
    medium: [
      { question: "Who directed the 1994 classic movie 'Pulp Fiction'?", options: ["Steven Spielberg", "Quentin Tarantino", "Martin Scorsese", "Christopher Nolan"], correctAnswerIndex: 1, explanation: "Quentin Tarantino wrote and directed 'Pulp Fiction'." },
      { question: "Which TV show features characters named Eleven, Mike, and Dustin?", options: ["Stranger Things", "The Umbrella Academy", "Dark", "Locke & Key"], correctAnswerIndex: 0, explanation: "'Stranger Things' on Netflix features Eleven, Mike, Dustin, and friends." },
      { question: "Which artist released the highest-selling album of all time, 'Thriller'?", options: ["Prince", "Michael Jackson", "Elvis Presley", "Stevie Wonder"], correctAnswerIndex: 1, explanation: "Michael Jackson's 1982 album 'Thriller' remains the best-selling album in history." },
      { question: "What is the highest-grossing film of all time (unadjusted for inflation)?", options: ["Avengers: Endgame", "Titanic", "Avatar", "Star Wars: The Force Awakens"], correctAnswerIndex: 2, explanation: "James Cameron's 'Avatar' (2009) is the highest-grossing film worldwide." },
      { question: "Who voices Woody in the 'Toy Story' franchise?", options: ["Tim Allen", "Tom Hanks", "Billy Crystal", "Robin Williams"], correctAnswerIndex: 1, explanation: "Tom Hanks voices Sheriff Woody in Toy Story." }
    ],
    hard: [
      { question: "Which film was the first animated movie to be nominated for Best Picture at the Oscars?", options: ["The Lion King", "Beauty and the Beast", "Spirited Away", "Toy Story"], correctAnswerIndex: 1, explanation: "'Beauty and the Beast' (1991) was the first animated film nominated for Best Picture." },
      { question: "Who composed the iconic musical score for 'Star Wars', 'Jaws', and 'Indiana Jones'?", options: ["Hans Zimmer", "Ennio Morricone", "John Williams", "Howard Shore"], correctAnswerIndex: 2, explanation: "Legendary composer John Williams created these iconic film scores." },
      { question: "In the TV series 'Breaking Bad', what is Walter White's criminal alias?", options: ["Cap'n Cook", "Heisenberg", "El Camino", "Saul Goodman"], correctAnswerIndex: 1, explanation: "Walter White adopts the pseudonym 'Heisenberg'." },
      { question: "Which rock band released the 1975 epic track 'Bohemian Rhapsody'?", options: ["The Beatles", "Led Zeppelin", "Queen", "Pink Floyd"], correctAnswerIndex: 2, explanation: "Queen released 'Bohemian Rhapsody' on their album 'A Night at the Opera'." },
      { question: "Which movie won 11 Oscars at the 76th Academy Awards, sweeping every category it was nominated for?", options: ["Titanic", "Ben-Hur", "The Lord of the Rings: The Return of the King", "Gladiator"], correctAnswerIndex: 2, explanation: "'The Return of the King' won all 11 Oscars it was nominated for in 2004." }
    ]
  },
  Science: {
    easy: [
      { question: "What chemical element has the symbol 'O'?", options: ["Gold", "Oxygen", "Osmium", "Hydrogen"], correctAnswerIndex: 1, explanation: "'O' is the chemical symbol for Oxygen." },
      { question: "What planet is closest to the Sun?", options: ["Venus", "Earth", "Mercury", "Mars"], correctAnswerIndex: 2, explanation: "Mercury is the innermost planet in our Solar System." },
      { question: "What gas do plants absorb from the atmosphere during photosynthesis?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Helium"], correctAnswerIndex: 1, explanation: "Plants convert Carbon Dioxide and sunlight into oxygen and glucose." },
      { question: "What is the hardest natural substance on Earth?", options: ["Quartz", "Granite", "Diamond", "Titanium"], correctAnswerIndex: 2, explanation: "Diamond is the hardest naturally occurring mineral." },
      { question: "How many bones are in the adult human body?", options: ["196", "206", "216", "250"], correctAnswerIndex: 1, explanation: "An adult human skeleton consists of 206 bones." }
    ],
    medium: [
      { question: "What is the speed of light in a vacuum approximately?", options: ["150,000 km/s", "300,000 km/s", "500,000 km/s", "1,000,000 km/s"], correctAnswerIndex: 1, explanation: "The speed of light in vacuum is approximately 299,792 km/s (300,000 km/s)." },
      { question: "Which organ in the human body produces insulin?", options: ["Liver", "Pancreas", "Kidney", "Gallbladder"], correctAnswerIndex: 1, explanation: "The beta cells of the pancreas secrete the hormone insulin." },
      { question: "What is the main component of Earth's atmosphere by volume?", options: ["Oxygen (21%)", "Nitrogen (78%)", "Carbon Dioxide (1%)", "Argon"], correctAnswerIndex: 1, explanation: "Nitrogen makes up approximately 78% of Earth's atmosphere." },
      { question: "What theory describes the origin and expansion of the universe?", options: ["String Theory", "Big Bang Theory", "Steady State Theory", "Relativity Theory"], correctAnswerIndex: 1, explanation: "The Big Bang Theory is the prevailing cosmological model for the universe." },
      { question: "What unit measures electrical resistance?", options: ["Volt", "Ampere", "Ohm", "Watt"], correctAnswerIndex: 2, explanation: "Electrical resistance is measured in Ohms (Ω)." }
    ],
    hard: [
      { question: "What particle is known as the 'God Particle' in quantum physics?", options: ["Higgs Boson", "Neutrino", "Quark", "Photon"], correctAnswerIndex: 0, explanation: "The Higgs Boson, discovered at CERN in 2012, is colloquially called the God Particle." },
      { question: "What is absolute zero in degrees Celsius?", options: ["-100 °C", "-273.15 °C", "-459.67 °C", "0 °C"], correctAnswerIndex: 1, explanation: "Absolute zero is 0 Kelvin, which equals -273.15 degrees Celsius." },
      { question: "Which scientist proposed the principle of Uncertainty in quantum mechanics?", options: ["Albert Einstein", "Niels Bohr", "Werner Heisenberg", "Erwin Schrödinger"], correctAnswerIndex: 2, explanation: "Werner Heisenberg formulated the Uncertainty Principle in 1927." },
      { question: "What type of chemical bond involves the sharing of electron pairs between atoms?", options: ["Ionic Bond", "Covalent Bond", "Metallic Bond", "Hydrogen Bond"], correctAnswerIndex: 1, explanation: "A covalent bond involves electron pair sharing between atoms." },
      { question: "Which cell organelle is responsible for cellular respiration and ATP production?", options: ["Ribosome", "Mitochondria", "Golgi Apparatus", "Endoplasmic Reticulum"], correctAnswerIndex: 1, explanation: "Mitochondria generate most of the chemical energy (ATP) needed by the cell." }
    ]
  },
  Mathematics: {
    easy: [
      { question: "What is the value of 15 multiplied by 8?", options: ["110", "120", "125", "130"], correctAnswerIndex: 1, explanation: "15 × 8 = 120." },
      { question: "What is the square root of 144?", options: ["10", "11", "12", "14"], correctAnswerIndex: 2, explanation: "12 × 12 = 144." },
      { question: "What is the sum of interior angles in a triangle?", options: ["90°", "180°", "270°", "360°"], correctAnswerIndex: 1, explanation: "The interior angles of any triangle always add up to 180°." },
      { question: "What is the median of the numbers 3, 7, 9, 12, 15?", options: ["7", "9", "9.2", "12"], correctAnswerIndex: 1, explanation: "The middle number in this ordered list is 9." },
      { question: "What percentage is equivalent to the fraction 3/4?", options: ["60%", "70%", "75%", "80%"], correctAnswerIndex: 2, explanation: "3 divided by 4 equals 0.75 or 75%." }
    ],
    medium: [
      { question: "If 3x + 9 = 24, what is the value of x?", options: ["3", "4", "5", "6"], correctAnswerIndex: 2, explanation: "3x = 24 - 9 = 15 => x = 15 / 3 = 5." },
      { question: "What is the value of Pi (π) rounded to 4 decimal places?", options: ["3.1415", "3.1416", "3.1420", "3.1412"], correctAnswerIndex: 1, explanation: "Pi is approximately 3.14159265..., which rounds to 3.1416." },
      { question: "What is 2 raised to the power of 8 (2⁸)?", options: ["128", "256", "512", "1024"], correctAnswerIndex: 1, explanation: "2⁸ = 256." },
      { question: "In a right-angled triangle, if legs are 6 and 8, what is the hypotenuse?", options: ["9", "10", "12", "14"], correctAnswerIndex: 1, explanation: "By Pythagorean theorem: √(6² + 8²) = √(36 + 64) = √100 = 10." },
      { question: "What is the prime factorization of 60?", options: ["2 × 3 × 10", "2² × 3 × 5", "2 × 5 × 6", "4 × 15"], correctAnswerIndex: 1, explanation: "60 = 4 × 15 = 2² × 3 × 5." }
    ],
    hard: [
      { question: "What is the derivative of f(x) = x³ with respect to x?", options: ["3x", "3x²", "x²/3", "x⁴/4"], correctAnswerIndex: 1, explanation: "By the power rule, d/dx(x³) = 3x²." },
      { question: "What is the logarithm log₁₀(1000)?", options: ["2", "3", "4", "100"], correctAnswerIndex: 1, explanation: "10³ = 1000, so log₁₀(1000) = 3." },
      { question: "How many distinct arrangements can be made with the letters in the word 'MATH'?", options: ["12", "16", "24", "48"], correctAnswerIndex: 2, explanation: "4 letters factorial (4!) = 4 × 3 × 2 × 1 = 24." },
      { question: "What is the sum of the infinite geometric series: 1 + 1/2 + 1/4 + 1/8 + ...?", options: ["1.5", "2", "2.5", "Infinity"], correctAnswerIndex: 1, explanation: "Formula S = a / (1 - r) = 1 / (1 - 0.5) = 2." },
      { question: "What is the value of Euler's number 'e' rounded to two decimal places?", options: ["2.14", "2.72", "3.14", "1.62"], correctAnswerIndex: 1, explanation: "Euler's number e is approximately 2.71828..., which rounds to 2.72." }
    ]
  },
  Riddles: {
    easy: [
      { question: "What has to be broken before you can use it?", options: ["A coconut", "An egg", "A glass", "A promise"], correctAnswerIndex: 1, explanation: "An egg must be broken before cooking or baking." },
      { question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", options: ["An Echo", "A Cloud", "A Shadow", "A Radio"], correctAnswerIndex: 0, explanation: "An echo sound bounces back without physical form." },
      { question: "What has hands, but cannot clap?", options: ["A tree", "A clock", "A statue", "A gloves"], correctAnswerIndex: 1, explanation: "A clock has hour and minute hands but cannot clap." },
      { question: "What gets wetter the more it dries?", options: ["A sponge", "A towel", "A cloud", "A river"], correctAnswerIndex: 1, explanation: "A towel absorbs moisture while drying something else." },
      { question: "What belongs to you, but other people use it more than you do?", options: ["Your phone", "Your money", "Your name", "Your house"], correctAnswerIndex: 2, explanation: "Other people address you by your name far more often than you say it yourself." }
    ],
    medium: [
      { question: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", options: ["A globe", "A map", "A dream", "A desert"], correctAnswerIndex: 1, explanation: "A map depicts geographical features without physical objects." },
      { question: "What can travel all around the world while staying in a corner?", options: ["A compass", "A stamp", "A letter", "A satellite"], correctAnswerIndex: 1, explanation: "A postage stamp stays in the corner of an envelope as it travels." },
      { question: "The more of this there is, the less you see. What is it?", options: ["Fog", "Darkness", "Light", "Smoke"], correctAnswerIndex: 1, explanation: "The more darkness there is, the harder it is to see." },
      { question: "What has a head and a tail, but no body?", options: ["A snake", "A coin", "A kite", "A needle"], correctAnswerIndex: 1, explanation: "A coin has heads and tails sides but no body." },
      { question: "I am light as a feather, yet the strongest person cannot hold me for more than five minutes. What am I?", options: ["A bubble", "Your breath", "A secret", "A shadow"], correctAnswerIndex: 1, explanation: "You cannot hold your breath for more than a few minutes." }
    ],
    hard: [
      { question: "A man dies of old age on his 25th birthday. How is this possible?", options: ["He was born on Feb 29 (Leap Year)", "He lived on Mars", "He used a time machine", "It was a riddle joke"], correctAnswerIndex: 0, explanation: "Leap year babies born on February 29th only celebrate a official birthday once every 4 years (25 × 4 = 100 years old!)." },
      { question: "What comes once in a minute, twice in a moment, but never in a thousand years?", options: ["The letter 'M'", "The number 1", "A second", "A heartbeat"], correctAnswerIndex: 0, explanation: "The letter 'M' appears once in 'minute', twice in 'moment', zero times in 'thousand years'." },
      { question: "I have no voice, yet I speak to you. I tell of all things in the world that people do. I have leaves, but no tree. What am I?", options: ["A forest", "A book", "A newspaper", "A mirror"], correctAnswerIndex: 1, explanation: "A book has paper leaves (pages) and conveys stories without a vocal voice." },
      { question: "Forward I am heavy, but backward I am not. What am I?", options: ["The word 'TON'", "A anchor", "A shadow", "A lead weight"], correctAnswerIndex: 0, explanation: "The word 'TON' spelled backward is 'NOT'." },
      { question: "What 5-letter word becomes shorter when you add two letters to it?", options: ["Short", "Small", "Brief", "Little"], correctAnswerIndex: 0, explanation: "The word 'Short' becomes 'S-H-O-R-T-E-R' when you add 'er'." }
    ]
  }
};

/**
 * Clean raw text response from AI API if it contains markdown JSON blocks
 */
function cleanJsonResponse(text) {
  if (!text) return null;
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Parse and validate 5 questions JSON array
 */
function parseQuestionsJson(rawText, genre, difficulty) {
  const cleaned = cleanJsonResponse(rawText);
  if (!cleaned) return null;

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length >= 5) {
      return parsed.slice(0, 5).map((q, idx) => ({
        id: `q-${idx + 1}-${Date.now()}`,
        question: q.question || `Question ${idx + 1}`,
        options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["Option 1", "Option 2", "Option 3", "Option 4"],
        correctAnswerIndex: typeof q.correctAnswerIndex === 'number' && q.correctAnswerIndex >= 0 && q.correctAnswerIndex <= 3 ? q.correctAnswerIndex : 0,
        explanation: q.explanation || "Correct answer!"
      }));
    }
  } catch (err) {
    console.warn('JSON parse warning from Gemini API output:', err.message);
  }
  return null;
}

/**
 * Get fallback pre-defined questions for a genre & difficulty (shuffled randomly)
 */
export function getFallbackQuestions(genre = 'Sports', difficulty = 'easy') {
  const genreKey = FALLBACK_BANK[genre] ? genre : 'Sports';
  const diffKey = ['easy', 'medium', 'hard'].includes(difficulty.toLowerCase()) ? difficulty.toLowerCase() : 'easy';
  
  const list = [...(FALLBACK_BANK[genreKey][diffKey] || FALLBACK_BANK['Sports']['easy'])];
  // Shuffle array using Fisher-Yates to avoid repetitive order
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }

  return list.slice(0, 5).map((q, idx) => ({
    id: `q-${diffKey}-${idx + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    question: q.question,
    options: [...q.options],
    correctAnswerIndex: q.correctAnswerIndex,
    explanation: q.explanation
  }));
}

/**
 * Main Question Generator: Calls Gemini AI API via process.env.GEMINI_API_KEY
 */
export async function generateQuizQuestions(genre = 'Sports', difficulty = 'easy') {
  const apiKey = process.env.GEMINI_API_KEY;
  const genreName = genre || 'Sports';
  const diffName = (difficulty || 'easy').toLowerCase();

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    console.log(`ℹ️ GEMINI_API_KEY not provided. Using fallback question set for ${genreName} (${diffName}).`);
    return getFallbackQuestions(genreName, diffName);
  }

  const randomSeed = Math.random().toString(36).substring(2, 10);
  const prompt = `Generate exactly 5 brand-new, completely unique, original multiple choice quiz questions for the genre "${genreName}" at difficulty level "${diffName}".
Do NOT use common cliché questions. Make sure all 5 questions are distinct, fresh, and creative (Session Seed: ${randomSeed}, Timestamp: ${Date.now()}).
Return ONLY a valid JSON array of 5 objects, with NO markdown formatting, NO triple backticks, and NO extra text outside the JSON.
Each object must strictly have this exact format:
[
  {
    "question": "Question string here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 0,
    "explanation": "Brief 1-sentence explanation."
  }
]`;

  const modelsToTry = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];

  for (const model of modelsToTry) {
    try {
      console.log(`🤖 Requesting Gemini API (${model}) for 5 fresh ${diffName.toUpperCase()} questions on "${genreName}" (Seed: ${randomSeed})...`);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 1.0
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const questions = parseQuestionsJson(rawText, genreName, diffName);
        if (questions) {
          console.log(`✅ Successfully generated 5 unique ${diffName.toUpperCase()} questions via Gemini AI API (${model})!`);
          return questions;
        }
      } else {
        const errorDetail = await response.text();
        console.warn(`⚠️ Gemini API model ${model} returned HTTP ${response.status}:`, errorDetail.substring(0, 150));
      }
    } catch (err) {
      console.error(`❌ Error invoking Gemini API (${model}):`, err.message);
    }
  }

  console.log(`ℹ️ Returning dynamic fallback question set for ${genreName} (${diffName}).`);
  return getFallbackQuestions(genreName, diffName);
}

/**
 * Single Question API-Only Generator: Returns null if API generation fails/times out
 */
export async function generateSingleQuizQuestionApiOnly(genre = 'Sports', difficulty = 'easy', questionNumber = 1, existingQuestions = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  const genreName = genre || 'Sports';
  const diffName = (difficulty || 'easy').toLowerCase();

  const existingTexts = existingQuestions.map(q => typeof q === 'string' ? q : q?.question).filter(Boolean);

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    return null;
  }

  const randomSeed = Math.random().toString(36).substring(2, 8);
  const avoidPrompt = existingTexts.length > 0 ? `Do NOT use or repeat any of these questions: ${JSON.stringify(existingTexts)}.` : '';

  const prompt = `Generate exactly 1 brand-new, unique multiple choice quiz question for the genre "${genreName}" at difficulty level "${diffName}" (Question #${questionNumber} of 5). ${avoidPrompt}
Return ONLY a valid JSON object (NOT an array) in this exact format with NO markdown formatting, NO triple backticks, and NO extra text:
{
  "question": "Question string here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswerIndex": 0,
  "explanation": "Brief 1-sentence explanation."
}`;

  const modelsToTry = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];

  for (const model of modelsToTry) {
    try {
      console.log(`🤖 Requesting Gemini API (${model}) for Single Q#${questionNumber} (${diffName.toUpperCase()}) on "${genreName}" (Seed: ${randomSeed})...`);

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 1.0 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const q = parseSingleQuestionJson(rawText);
        if (q) {
          console.log(`✅ Single Q#${questionNumber} (${diffName.toUpperCase()}) generated via Gemini AI (${model})!`);
          return {
            id: `q-${diffName}-${questionNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            ...q
          };
        }
      } else {
        const errorDetail = await response.text();
        console.warn(`⚠️ Gemini API model ${model} returned HTTP ${response.status}:`, errorDetail.substring(0, 120));
      }
    } catch (err) {
      console.warn(`⚠️ Gemini API single question error (${model}):`, err.message);
    }
  }

  return null;
}

/**
 * Single Question Generator: Generates 1 single question via Gemini AI or Fallback
 */
export async function generateSingleQuizQuestion(genre = 'Sports', difficulty = 'easy', questionNumber = 1, existingQuestions = []) {
  const existingTexts = existingQuestions.map(q => typeof q === 'string' ? q : q?.question).filter(Boolean);
  const q = await generateSingleQuizQuestionApiOnly(genre, difficulty, questionNumber, existingTexts);
  if (q) return q;

  console.log(`ℹ️ Returning fallback for Single Q#${questionNumber} on "${genre}" (${difficulty}).`);
  return getSingleFallbackQuestion(genre, difficulty, questionNumber - 1, existingTexts);
}

function parseSingleQuestionJson(rawText) {
  const cleaned = cleanJsonResponse(rawText);
  if (!cleaned) return null;
  try {
    const parsed = JSON.parse(cleaned);
    const item = Array.isArray(parsed) ? parsed[0] : parsed;
    if (item && item.question && Array.isArray(item.options) && item.options.length === 4) {
      const idx = typeof item.correctAnswerIndex === 'number' && item.correctAnswerIndex >= 0 && item.correctAnswerIndex <= 3
        ? item.correctAnswerIndex
        : 0;
      return {
        question: item.question,
        options: item.options,
        correctAnswerIndex: idx,
        explanation: item.explanation || 'No explanation provided.'
      };
    }
  } catch (err) {
    console.warn('Single question JSON parse warning:', err.message);
  }
  return null;
}

const globalUsedQuestionTexts = new Set();

export function getSingleFallbackQuestion(genre = 'Sports', difficulty = 'easy', index = 0, existingTexts = []) {
  const genreKey = FALLBACK_BANK[genre] ? genre : 'Sports';
  const diffKey = ['easy', 'medium', 'hard'].includes(difficulty.toLowerCase()) ? difficulty.toLowerCase() : 'easy';
  const list = FALLBACK_BANK[genreKey][diffKey] || FALLBACK_BANK['Sports']['easy'];

  const currentAvoidSet = new Set([
    ...existingTexts.map(t => typeof t === 'string' ? t : t?.question).filter(Boolean)
  ]);

  let candidates = list.filter(q => !currentAvoidSet.has(q.question) && !globalUsedQuestionTexts.has(q.question));
  if (candidates.length === 0) {
    candidates = list.filter(q => !currentAvoidSet.has(q.question));
  }
  if (candidates.length === 0) {
    candidates = list;
  }

  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  if (selected) {
    globalUsedQuestionTexts.add(selected.question);
    if (globalUsedQuestionTexts.size > 200) {
      const firstItem = globalUsedQuestionTexts.values().next().value;
      globalUsedQuestionTexts.delete(firstItem);
    }
  }

  return {
    id: `q-${diffKey}-${index + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    question: selected ? selected.question : `Question #${index + 1}`,
    options: selected ? [...selected.options] : ["Option A", "Option B", "Option C", "Option D"],
    correctAnswerIndex: selected ? selected.correctAnswerIndex : 0,
    explanation: selected ? selected.explanation : "Correct answer!"
  };
}
