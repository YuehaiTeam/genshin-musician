<template>
    <div class="nor" v-if="mode != 'record'">
        <button @click="openMidi">
            {{ mode == "midi" ? "MIDI" : mode == "" ? "打开" : "回放" }}
        </button>
        <button @click="playing = !playing" :disabled="!mode">
            {{ playing ? "暂停" : "播放" }}
        </button>

        <button @click="readyRec">录制</button>

        <div class="tex" v-if="mode != 'seq'">播放/暂停快捷键为反引号（`）</div>
        <div class="tex" v-else>
            BPM：
            <input type="range" v-model="speed" min="100" max="300" />
        </div>
        <div class="playbar">
            <div class="playbar-inner" :style="{ width: progress + '%' }"></div>
        </div>
    </div>
    <div class="record" v-if="mode == 'record'">
        <button @click="(mode = recMode), (playing = false)">退出</button>
        <button :disabled="!mode" @click="playing = !playing">
            {{ playing ? "暂停" : "开始" }}
        </button>
        <button @click="seq.pop()" v-if="recMode == 'seq'">撤销</button>
        <button :disabled="seq.length <= 0" @click="saveRec">保存</button>
        <button @click="swMode">
            {{ recMode == "seq" ? "自动对齐：开" : "自动对齐：关" }}
        </button>
        <div class="tex">
            {{ seq.length }}
        </div>
    </div>
</template>

<script>
import fs from "fs";
import { ev } from "@/ev";
import { extname } from "path";
import { remote } from "electron";
import { Player as MidiPlayer } from "midi-player-js";
const revmap = {
    q: 31,
    w: 32,
    e: 33,
    r: 34,
    t: 35,
    y: 36,
    u: 37,

    a: 21,
    s: 22,
    d: 23,
    f: 24,
    g: 25,
    h: 26,
    j: 27,

    z: 11,
    x: 12,
    c: 13,
    v: 14,
    b: 15,
    n: 16,
    m: 17,
};

export default {
    name: "App",
    data() {
        return {
            mode: "",
            playing: false,
            progress: 0,
            seq: [],
            seqCur: 0,
            speed: 200,
            recMode: "time",
            lastSeq: 0,
        };
    },
    components: {},
    watch: {
        playing(v) {
            switch (this.mode) {
                case "midi":
                    if (v) {
                        this._midi.play();
                    } else {
                        this._midi.pause();
                    }
                    break;
                case "seq":
                    if (v) {
                        this.seqPlayer();
                    }
                    break;
                case "time":
                    if (v) {
                        this.timePlayer();
                    }
                    break;
                case "record":
                    this.lastSeq = 0;
                    break;
                default:
                    break;
            }
        },
    },
    methods: {
        swMode() {
            this.seq = [];
            this.recMode = this.recMode == "seq" ? "time" : "seq";
        },
        readyRec() {
            this.seq = [];
            this.mode = "record";
            this.playing = false;
        },
        async saveRec() {
            const file = await remote.dialog.showSaveDialog({
                filters: [
                    { name: "JSON Record", extensions: ["json"] },
                    { name: "All Files", extensions: ["*"] },
                ],
                properties: ["saveFile"],
            });
            if (file.canceled) return;
            const obj = {
                "genshin-musician": this.recMode,
                data: this.seq,
            };
            await fs.promises.writeFile(file.filePath, JSON.stringify(obj));
            remote.dialog.showMessageBox({
                title: "提示",
                message: "保存成功！",
            });
        },
        async openMidi() {
            const file = await remote.dialog.showOpenDialog({
                filters: [
                    {
                        name: "支持的文件(MIDI或录制) ",
                        extensions: ["mid", "midi", "json"],
                    },
                    { name: "MIDI Audio", extensions: ["mid", "midi"] },
                    { name: "JSON Record", extensions: ["json"] },
                    { name: "All Files", extensions: ["*"] },
                ],
                properties: ["openFile"],
            });
            if (file.filePaths[0]) {
                const isMidi = extname(file.filePaths[0]).includes("mid");
                const toPlay = await fs.promises.readFile(file.filePaths[0]);
                if (isMidi) {
                    this.mode = "midi";
                    if (this._midi) {
                        this._midi.pause();
                    }
                    this._midi = new MidiPlayer(this.onMidiNote.bind(this));
                    this._midi.loadArrayBuffer(toArrayBuffer(toPlay));
                    this._midi.on("endOfFile", () => {
                        console.log("END");
                        this._midi = null;
                        this.progress = 0;
                    });
                    this.playing = false;
                } else {
                    let json;
                    try {
                        json = JSON.parse(toPlay.toString());
                        if (
                            json["genshin-musician"] != "seq" &&
                            json["genshin-musician"] != "time"
                        )
                            throw new Error();
                    } catch (e) {
                        alert("不是正常的录制文件");
                    }
                    this.seq = json.data;
                    this.seqCur = 0;
                    this.mode = json["genshin-musician"];
                    this.playing = false;
                }
                console.log(toPlay);
            }
        },
        onMidiNote(event) {
            if (event.name == "Note on") {
                const key = midiToGenshinKey(event.noteName, 0);
                console.log(key);
                if (!key) return;
                ev.emit("sendKey", key);
            }
            if (this._midi) {
                this.progress = 100 - this._midi.getSongPercentRemaining();
            }
        },
        onKey(event) {
            if (event.keycode == 41) {
                if (this.mode) this.playing = !this.playing;
            }
            if (this.mode == "record" && this.playing) {
                const kw = event.rawcode;
                let str = String.fromCharCode(kw).toLowerCase();
                if (this.recMode == "seq") {
                    if (kw == 32) this.seq.push(0);
                    if (65 > kw || 90 < kw) return;
                    this.seq.push(revmap[str]);
                } else {
                    if (65 > kw || 90 < kw) return;
                    if (this.lastSeq == 0) {
                        this.seq.push([0, revmap[str]]);
                    } else {
                        this.seq.push([Date.now() - this.lastSeq, revmap[str]]);
                    }
                    this.lastSeq = Date.now();
                }
            }
        },
        async seqPlayer() {
            for (; this.seqCur < this.seq.length; this.seqCur++) {
                const key = seqToGenshinKey(this.seq[this.seqCur]);
                console.log(key);
                if (key) ev.emit("sendKey", key);
                await sleep((1 / (this.speed / 60)) * 1000);
                this.progress = (this.seqCur / this.seq.length) * 100;
                if (!this.playing) return;
            }
            this.progress = 0;
            this.seqCur = 0;
            this.playing = false;
        },
        async timePlayer() {
            for (; this.seqCur < this.seq.length; this.seqCur++) {
                const note = this.seq[this.seqCur];
                console.log(note);
                await sleep(note[0]);
                const key = seqToGenshinKey(note[1]);
                if (key) ev.emit("sendKey", key);
                this.progress = (this.seqCur / this.seq.length) * 100;
                if (!this.playing) return;
            }
            this.progress = 0;
            this.seqCur = 0;
            this.playing = false;
        },
    },
    created() {
        this._onKey = this.onKey.bind(this);
        ev.on("captureKey", this._onKey);
    },
    beforeUnmount() {
        ev.off("captureKey", this._onKey);
    },
};

function toArrayBuffer(buf) {
    var ab = new ArrayBuffer(buf.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
}

function seqToGenshinKey(tag) {
    if (!tag) return false;
    tag = tag.toString();
    const keyMatrix = [
        "zxcvbnm".toUpperCase().split(""),
        "asdfghj".toUpperCase().split(""),
        "qwertyu".toUpperCase().split(""),
    ];
    try {
        return keyMatrix[tag[0] - 1][tag[1] - 1];
    } catch (e) {
        return false;
    }
}
function midiToGenshinKey(note, offset) {
    const cMap = "CDEFGAB".split("");
    note = note.replace("b", ""); // 原神没有半音，直接降低处理
    let note0 = cMap.indexOf(note[0]);
    let note1 = note[1];
    const keyMatrix = [
        "zxcvbnm".toUpperCase().split(""),
        "asdfghj".toUpperCase().split(""),
        "qwertyu".toUpperCase().split(""),
    ];
    note1 = Number(note1) + offset;
    try {
        return keyMatrix[note1 - 3][note0];
    } catch (e) {
        // DO NOTHING
    }
    try {
        return keyMatrix[note1][note0];
    } catch (e) {
        // DO NOTHING
    }
    try {
        return keyMatrix[note1 + 3][note0];
    } catch (e) {
        // DO NOTHING
    }
    return false;
}

function sleep(t) {
    return new Promise((resolve) => setTimeout(resolve, t));
}
</script>

<style lang="scss">
html,
body {
    margin: 0;
}
.playbar {
    position: absolute;
    background: #eee;
    height: 5px;
    bottom: 0;
    left: 0;
    right: 0;
}

.playbar-inner {
    height: 5px;
    position: absolute;
    top: 0;
    left: 0;
    width: 0%;
    background: #ff6565;
    transition: all 0.1s;
}
button {
    height: 36px;
    background: #ff6565;
    color: #fff;
    padding: 0 10px;
    box-sizing: border-box;
    line-height: 32px;
    border: 1px solid #a90000;
    margin-right: -1px;
    cursor: pointer;
    &[disabled] {
        background: #b75c5c;
        cursor: not-allowed;
    }
}

.tex {
    position: absolute;
    right: 10px;
    height: 32px;
    top: 0;
    line-height: 35px;
    vertical-align: middle;
}
</style>
