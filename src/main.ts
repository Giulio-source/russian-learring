import "./styles.css";
import { state } from "./state";
import { initKeyboard } from "./ui/keyboard";
import { initLoad, openLoad } from "./ui/load";
import { initMenu, openMenu } from "./ui/menu";
import { initQuiz } from "./ui/quiz";
import { initSession } from "./ui/session";
import { initSpeech } from "./speech";
import { initSummary } from "./ui/summary";

initLoad();
initMenu();
initSession();
initQuiz();
initSummary();
initKeyboard();
initSpeech();

if (state.cards.length) openMenu();
else openLoad(false);
