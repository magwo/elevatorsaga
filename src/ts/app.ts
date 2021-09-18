import * as $ from 'jquery';
import * as CodeMirror from 'codemirror';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/mode/javascript/javascript';
import { riot, Observable } from './lib/riot';
import * as _ from 'lodash';

import { getCodeObjFromCode, CodeObj } from './base';
import { createWorldCreator, createWorldController, WorldController, WorldCreator, World } from './world';
import { challenges } from './challenges';
import { clearAll, presentStats, presentChallenge, presentWorld, presentCodeStatus, presentFeedback, makeDemoFullscreen } from './presenters';

declare global {
    interface Window {
        world: World;
    }
}

interface IEditor {
    getCodeObj(): CodeObj | null;
    setCode(code: string): void;
    getCode(): string;
    setDevTestCode(): void;
}

type Editor = Observable<IEditor>;

const createEditor = () => {
    const lsKey = "elevatorCrushCode_v5";

    const cm = CodeMirror.fromTextArea(document.getElementById("code")! as HTMLTextAreaElement, {
        lineNumbers: true,
        indentUnit: 4,
        indentWithTabs: false,
        theme: "solarized light",
        mode: "javascript",
        autoCloseBrackets: true,
        extraKeys: {
            // the following Tab key mapping is from http://codemirror.net/doc/manual.html#keymaps
            Tab(cm) {
                const spaces = new Array(cm.getOption("indentUnit")! + 1).join(" ");
                cm.replaceSelection(spaces);
            }
        }
    });

    // reindent on paste (adapted from https://github.com/ahuth/brackets-paste-and-indent/blob/master/main.js)
    cm.on("change", (codeMirror, change) => {
        if(change.origin !== "paste") {
            return;
        }

        const lineFrom = change.from.line;
        const lineTo = change.from.line + change.text.length;

        const reindentLines = (codeMirror: CodeMirror.Editor, lineFrom: number, lineTo: number) => {
            codeMirror.operation(() => {
                codeMirror.eachLine(lineFrom, lineTo, (lineHandle) => {
                    codeMirror.indentLine(codeMirror.getLineNumber(lineHandle)!, "smart");
                });
            });
        };

        reindentLines(codeMirror, lineFrom, lineTo);
    });

    const reset = () => {
        cm.setValue($("#default-elev-implementation").text().trim());
    };
    const saveCode = () => {
        localStorage.setItem(lsKey, cm.getValue());
        $("#save_message").text("コードを保存しました： " + new Date().toTimeString());
        returnObj.trigger("change");
    };

    const existingCode = localStorage.getItem(lsKey);
    if(existingCode) {
        cm.setValue(existingCode);
    } else {
        reset();
    }

    $("#button_save").on("click", () => {
        saveCode();
        cm.focus();
    });

    $("#button_reset").on("click", () => {
        if(confirm("デフォルトのプログラムに戻します。よろしいですか？")) {
            localStorage.setItem("develevateBackupCode", cm.getValue());
            reset();
        }
        cm.focus();
    });

    $("#button_resetundo").on("click", () => {
        if(confirm("リセット前の状態に戻しますか？")) {
            cm.setValue(localStorage.getItem("develevateBackupCode") || "");
        }
        cm.focus();
    });

    const returnObj: Editor = riot.observable({} as IEditor);
    const autoSaver = _.debounce(saveCode, 1000);
    cm.on("change", () => {
        autoSaver();
    });

    returnObj.getCodeObj = () => {
        console.log("Getting code...");
        const code = cm.getValue();
        let obj: CodeObj;
        try {
            obj = getCodeObjFromCode(code);
            returnObj.trigger("code_success");
        } catch(e) {
            returnObj.trigger("usercode_error", e);
            return null;
        }
        return obj;
    };
    returnObj.setCode = (code) => {
        cm.setValue(code);
    };
    returnObj.getCode = () => {
        return cm.getValue();
    }
    returnObj.setDevTestCode = () => {
        cm.setValue($("#devtest-elev-implementation").text().trim());
    }

    $("#button_apply").on("click", () => {
        returnObj.trigger("apply_code");
    });
    return returnObj;
};


const createParamsUrl = (current: { [key: string]: string }, overrides: { [key: string]: string }) => {
    return "#" + _.map(_.merge(current, overrides), (val, key) => {
        return key + "=" + val;
    }).join(",");
};

interface IApp {
    currentChallengeIndex: number;
    worldController: WorldController;
    worldCreator: WorldCreator;
    world: World;
    startStopOrRestart(): void;
    startChallenge(challengeIndex: number, autoStart?: boolean): void;
}

export type App = Observable<IApp>;

$(() => {
    const tsKey = "elevatorTimeScale";
    const editor = createEditor();

    let params = {} as {[key: string]: string};

    const $world = $(".innerworld");
    const $stats = $(".statscontainer");
    const $feedback = $(".feedbackcontainer");
    const $challenge = $(".challenge");
    const $codestatus = $(".codestatus");

    const floorTempl = document.getElementById("floor-template")!.innerHTML.trim();
    const elevatorTempl = document.getElementById("elevator-template")!.innerHTML.trim();
    const elevatorButtonTempl = document.getElementById("elevatorbutton-template")!.innerHTML.trim();
    const userTempl = document.getElementById("user-template")!.innerHTML.trim();
    const challengeTempl = document.getElementById("challenge-template")!.innerHTML.trim();
    const feedbackTempl = document.getElementById("feedback-template")!.innerHTML.trim();
    const codeStatusTempl = document.getElementById("codestatus-template")!.innerHTML.trim();

    const app = riot.observable({} as IApp);
    app.worldController = createWorldController(1.0 / 60.0);
    app.worldController.on("usercode_error", (e: any) => {
        console.log("World raised code error", e);
        editor.trigger("usercode_error", e);
    });

    console.log(app.worldController);
    app.worldCreator = createWorldCreator();

    app.currentChallengeIndex = 0;

    app.startStopOrRestart = () => {
        if(app.world.challengeEnded) {
            app.startChallenge(app.currentChallengeIndex);
        } else {
            app.worldController.setPaused(!app.worldController.isPaused);
        }
    };

    app.startChallenge = (challengeIndex, autoStart) => {
        if(typeof app.world !== "undefined") {
            app.world.unWind();
            // TODO: Investigate if memory leaks happen here
        }
        app.currentChallengeIndex = challengeIndex;
        app.world = app.worldCreator.createWorld(challenges[challengeIndex].options);
        window.world = app.world;

        clearAll([$world, $feedback]);
        presentStats($stats, app.world);
        presentChallenge($challenge, challenges[challengeIndex], app, app.world, app.worldController, challengeIndex + 1, challengeTempl);
        presentWorld($world, app.world, floorTempl, elevatorTempl, elevatorButtonTempl, userTempl);

        app.worldController.on("timescale_changed", () => {
            localStorage.setItem(tsKey, `${app.worldController.timeScale}`);
            presentChallenge($challenge, challenges[challengeIndex], app, app.world, app.worldController, challengeIndex + 1, challengeTempl);
        });

        app.world.on("stats_changed", () => {
            const challengeStatus = challenges[challengeIndex].condition.evaluate(app.world);
            if(challengeStatus !== null) {
                app.world.challengeEnded = true;
                app.worldController.setPaused(true);
                if(challengeStatus) {
                    presentFeedback($feedback, feedbackTempl, app.world, "成功です!", "目標を達成しました", createParamsUrl(params, { challenge: `${(challengeIndex + 2)}`}));
                } else {
                    presentFeedback($feedback, feedbackTempl, app.world, "目標失敗", "プログラムを改良する必要があるかも？", "");
                }
            }
        });

        const codeObj = editor.getCodeObj();
        console.log("Starting...");
        app.worldController.start(app.world, codeObj, window.requestAnimationFrame, autoStart);
    };

    editor.on("apply_code", () => {
        app.startChallenge(app.currentChallengeIndex, true);
    });
    editor.on("code_success", () => {
        presentCodeStatus($codestatus, codeStatusTempl);
    });
    editor.on("usercode_error", (error: any) => {
        presentCodeStatus($codestatus, codeStatusTempl, error);
    });
    editor.on("change", () => {
        $("#fitness_message").addClass("faded");
        const codeStr = editor.getCode();
        // fitnessSuite(codeStr, true, function(results) {
        //     var message = "";
        //     if(!results.error) {
        //         message = "Fitness avg wait times: " + _.map(results, function(r){ return r.options.description + ": " + r.result.avgWaitTime.toPrecision(3) + "s" }).join("&nbsp&nbsp&nbsp");
        //     } else {
        //         message = "Could not compute fitness due to error: " + results.error;
        //     }
        //     $("#fitness_message").html(message).removeClass("faded");
        // });
    });
    editor.trigger("change");

    riot.route!((path: string) => {
        params = _.reduce(path.split(","), (result, p) => {
            const match = p.match(/(\w+)=(\w+$)/);
            if(match) { result[match[1]] = match[2]; } return result;
        }, {} as {[key: string]: string});
        let requestedChallenge = 0;
        let autoStart = false;
        const tsVal = localStorage.getItem(tsKey);
        let timeScale = tsVal ? parseFloat(tsVal) : 2.0;
        _.each(params, (val, key) => {
            if(key === "challenge") {
                requestedChallenge = _.parseInt(val) - 1;
                if(requestedChallenge < 0 || requestedChallenge >= challenges.length) {
                    console.log("Invalid challenge index", requestedChallenge);
                    console.log("Defaulting to first challenge");
                    requestedChallenge = 0;
                }
            } else if(key === "autostart") {
                autoStart = val === "false" ? false : true;
            } else if(key === "timescale") {
                timeScale = parseFloat(val);
            } else if(key === "devtest") {
                editor.setDevTestCode();
            } else if(key === "fullscreen") {
                makeDemoFullscreen();
            }
        });
        app.worldController.setTimeScale(timeScale);
        app.startChallenge(requestedChallenge, autoStart);
    });

    console.log(location.hash);
    if (location.hash.length === 0) {
        location.hash = "#challenge=1";
    }
});
