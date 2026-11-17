import "./styles.css";
import { removeLegacyKeys } from "./storage";
import { initSpeech } from "./speech";
import { initKeyboard } from "./ui/keyboard";
import { loadDeck } from "./ui/load";
import { initMenu } from "./ui/menu";
import { initQuiz } from "./ui/quiz";
import { initSession } from "./ui/session";
import { initSummary } from "./ui/summary";

removeLegacyKeys();
initMenu();
initSession();
initQuiz();
initSummary();
initKeyboard();
initSpeech();
void loadDeck();
