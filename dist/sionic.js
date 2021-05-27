(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Sionic = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
module.exports = require("./lib/mml");

},{"./lib/mml":2}],2:[function(require,module,exports){
// Original source are written by mohayonao 
// https://github.com/mohayonao/pico.js/blob/master/examples/demo.js

// Modify by minipop, to use as a library.
// MIT license. see: https://github.com/mohayonao/pico.js

function Sionic(mmldata) {
    "use strict";

    function inherits(ctor, superCtor) {
        ctor.prototype = Object.create(superCtor.prototype, {
            constructor: { value: ctor }
        });
    }

    function repeat(n, ch) {
        var str = "";
        for (var i = 0; i < n; i++) {
            str += ch;
        }
        return str;
    }

    function midicps(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    var ToneGenerator = (function() {
        function ToneGenerator() {
            this.sampleRate = Pico.sampleRate;
            this.velocity = 0.8;
            this.cell = new Float32Array(Pico.bufferSize);
        }

        ToneGenerator.prototype.setVelocity = function(val) {
            return this.velocity = val / 16;
        };

        ToneGenerator.prototype.setParams = function(val) {
            if (this.env) {
                this.env.setParams(val);
            }
        };

        return ToneGenerator;
    })();

    var FM2OP = (function(fmParams) {
        function FM2OP(fmParams) {
            ToneGenerator.call(this);
            this.op = [
                { phase: 0, phaseIncr: 0, amp: 1 },
                { phase: 0, phaseIncr: 0, amp: 1 },
            ];
            this.fb = 0;
            this.fblv              = fmParams[1] / 1000.0;
            this.modulatorDecay    = fmParams[2] / 1000.0;
            this.modulatorAmp      = fmParams[3] / 1000.0;
            this.modulatorMultiple = fmParams[4] / 1000.0;
        }
        inherits(FM2OP, ToneGenerator);

        FM2OP.prototype.setFreq = function(val) {
            this.op[0].phaseIncr = val / this.sampleRate * this.modulatorMultiple;
            this.op[1].phaseIncr = val / this.sampleRate;
            this.op[0].amp = this.modulatorAmp;
            this.op[1].amp = 1;
        };

        FM2OP.prototype.process = function() {
            var op = this.op;

            for (var i = 0, imax = this.cell.length; i < imax; i++) {
                var phase0 = op[0].phase + this.fb * this.fblv;
                var x0 = Math.sin(phase0 * 2 * Math.PI) * op[0].amp;
                var phase1 = op[1].phase + x0;
                var x1 = Math.sin(phase1 * 2 * Math.PI) * op[1].amp;
                this.cell[i] = x1 * this.velocity * 0.15;
                this.fb = x0;
                op[0].phase += op[0].phaseIncr;
                op[1].phase += op[1].phaseIncr;
            }

            op[0].amp *= this.modulatorDecay;

            return this.cell;
        };

        return FM2OP;
    })();

    var WaveMemory32 = (function(waveTable32) {
        function WaveMemory32(waveTable32) {
            ToneGenerator.call(this);
            this.env = new Envelope();
            this.phase = 0;
            this.phaseIncr = 0;
            this.waveTable32 = waveTable32;
            for (let i = 0; i < 32; i++) {
              this.waveTable32[i] /= 1280;
            }
        }
        inherits(WaveMemory32, ToneGenerator);

        WaveMemory32.prototype.setFreq = function(val) {
            this.phaseIncr = val / this.sampleRate;
            this.env.bang();
        };

        WaveMemory32.prototype.process = function() {
            for (var i = 0, imax = this.cell.length; i < imax; i++) {
                this.cell[i] = this.waveTable32[Math.floor(this.phase * 32)] * this.velocity;
                this.phase += this.phaseIncr;
                while (this.phase >= 1) {
                    this.phase = 0;
                }
            }
            this.env.process(this.cell);

            return this.cell;
        };

        return WaveMemory32;
    })();

    var FMSynthBass = (function() {
        function FMSynthBass() {
            ToneGenerator.call(this);
            this.op = [
                { phase: 0, phaseIncr: 0, amp: 1 },
                { phase: 0, phaseIncr: 0, amp: 1 },
            ];
            this.fb = 0;
            this.fblv = 0.097;
        }
        inherits(FMSynthBass, ToneGenerator);

        FMSynthBass.prototype.setFreq = function(val) {
            this.op[0].phaseIncr = val / this.sampleRate * 0.5;
            this.op[1].phaseIncr = val / this.sampleRate;
            this.op[0].amp = 0.75;
            this.op[1].amp = 1;
        };

        FMSynthBass.prototype.process = function() {
            var op = this.op;

            for (var i = 0, imax = this.cell.length; i < imax; i++) {
                var phase0 = op[0].phase + this.fb * this.fblv;
                var x0 = Math.sin(phase0 * 2 * Math.PI) * op[0].amp;
                var phase1 = op[1].phase + x0;
                var x1 = Math.sin(phase1 * 2 * Math.PI) * op[1].amp;
                this.cell[i] = x1 * this.velocity * 0.15;
                this.fb = x0;
                op[0].phase += op[0].phaseIncr;
                op[1].phase += op[1].phaseIncr;
            }

            op[0].amp *= 0.995;

            return this.cell;
        };

        return FMSynthBass;
    })();

    var FMSynthLead = (function() {
        function FMSynthLead() {
            ToneGenerator.call(this);
            this.op = [
                { phase: 0, phaseIncr: 0, amp: 1 },
                { phase: 0, phaseIncr: 0, amp: 1 },
                { phase: 0, phaseIncr: 0, amp: 1 },
                { phase: 0, phaseIncr: 0, amp: 1 },
            ];
            this.fb = 0;
            this.fblv = 0.3;
            this.env = new Envelope();
        }
        inherits(FMSynthLead, ToneGenerator);

        FMSynthLead.prototype.setFreq = function(val) {
            this.op[0].phaseIncr = val / this.sampleRate * 2;
            this.op[1].phaseIncr = val / this.sampleRate * 1;
            this.op[2].phaseIncr = val / this.sampleRate * 4;
            this.op[3].phaseIncr = val / this.sampleRate * 1.005;
            this.op[0].amp = 0.5;
            this.op[1].amp = 2;
            this.op[2].amp = 4;
            this.op[3].amp = 0.5;
            this.env.bang();
        };

        FMSynthLead.prototype.process = function() {
            var op = this.op;

            for (var i = 0, imax = this.cell.length; i < imax; i++) {
                var phase0 = op[0].phase + this.fb * this.fblv;
                var x0 = Math.sin(phase0 * 2 * Math.PI) * op[0].amp;
                var phase1 = op[1].phase + x0;
                var x1 = Math.sin(phase1 * 2 * Math.PI) * op[1].amp;
                var phase2 = op[2].phase;
                var x2 = Math.sin(phase2 * 2 * Math.PI) * op[2].amp;
                var phase3 = op[3].phase + x2;
                var x3 = Math.sin(phase3 * 2 * Math.PI) * op[3].amp;
                this.cell[i] = (x1 + x3) * this.velocity * 0.1;
                this.fb = x0;
                op[0].phase += op[0].phaseIncr;
                op[1].phase += op[1].phaseIncr;
                op[2].phase += op[2].phaseIncr;
                op[3].phase += op[3].phaseIncr;
            }

            op[0].amp *= 0.9988;
            op[2].amp *= 0.9998;

            this.env.process(this.cell);
            return this.cell;
        };

        return FMSynthLead;
    })();

    var PwmGenerator = (function() {
        function PwmGenerator() {
            ToneGenerator.call(this);
            this.env = new Envelope();
            this.phase = 0;
            this.phaseIncr = 0;
            this.width = 0.5;
        }
        inherits(PwmGenerator, ToneGenerator);

        PwmGenerator.prototype.setFreq = function(val) {
            this.phaseIncr = val / this.sampleRate;
            this.env.bang();
        };

        PwmGenerator.prototype.setWidth = function(val) {
            this.width = val * 0.01;
        };

        PwmGenerator.prototype.process = function() {
            for (var i = 0, imax = this.cell.length; i < imax; i++) {
                this.cell[i] = (this.phase < this.width ? +0.1 : -0.1) * this.velocity;
                this.phase += this.phaseIncr;
                while (this.phase >= 1) {
                    this.phase -= 1;
                }
            }

            this.env.process(this.cell);

            return this.cell;
        };

        return PwmGenerator;
    })();

    var NoiseGenerator = (function() {
        function NoiseGenerator() {
            ToneGenerator.call(this);
            this.env = new Envelope();
            this.phase = 0;
            this.phaseIncr = 1;
            this.value = 0;
            this.onOff = 0;
        }
        inherits(NoiseGenerator, ToneGenerator);

        NoiseGenerator.prototype.setFreq = function(val) {
            this.onOff = val ? 0.15 : 0;
            this.env.bang();
        };

        NoiseGenerator.prototype.setNoise = function(val) {
            if (val > 0) {
                this.phaseIncr = 4 / val;
            } else {
                this.phaseIncr = 0;
            }
        };

        NoiseGenerator.prototype.process = function() {
            for (var i = 0, imax = this.cell.length; i < imax; i++) {
                this.cell[i] = this.value * this.onOff;
                this.phase += this.phaseIncr;
                if (this.phase >= 1) {
                    this.phase -= 1;
                    this.value = Math.random() * this.velocity;
                }
            }

            this.env.process(this.cell);

            return this.cell;
        };

        return NoiseGenerator;
    })();

    var Envelope = (function() {
        function Envelope() {
            this.sampleRate = Pico.sampleRate;
            this.a = 0;
            this.d = 64;
            this.s = 32;
            this.r = 0;
            this.samples = 0;
            this.status = 0;
            this.x = 1;
            this.dx = 0;
        }

        Envelope.prototype.setParams = function(params) {
            this.a = params[0];
            this.d = params[1];
            this.s = params[2];
            this.r = params[3];
        };

        Envelope.prototype.bang = function() {
            this.samples = 0;
            this.status = 0;
            this.x = 1;
            this.dx = 0;
        };

        Envelope.prototype.process = function(cell) {
            while (this.samples <= 0) {
                switch (this.status) {
                    case 0:
                        this.status = 1;
                        this.samples = (this.a * 0.005) * this.sampleRate;
                        this.x = 0;
                        this.dx = (1 / this.samples) * cell.length;
                        break;
                    case 1:
                        this.status = 2;
                        this.samples = (this.d * 0.005) * this.sampleRate;
                        this.x = 1;
                        this.dx = -(1 / this.samples) * cell.length;
                        this.dx *= (1 - this.s / 128);
                        break;
                    case 2:
                        this.status = 3;
                        this.samples = Infinity;
                        this.dx = 0;
                        if (this.s === 0) {
                            this.x = 0;
                        }
                }
            }

            for (var i = 0, imax = cell.length; i < imax; i++) {
                cell[i] *= this.x;
            }

            this.x += this.dx;
            this.samples -= cell.length;

            return cell;
        };

        return Envelope;
    })();

    var MMLTrack = (function() {
        function MMLTrack(mml) {
            this.sampleRate = Pico.sampleRate;
            this.tempo = 120;
            this.len = 4;
            this.octave = 5;
            this.keyTranspose = 0;
            this.tie = false;
            this.curFreq = 0;
            this.index = -1;
            this.samples = 0;
            this.loopStack = [];
            this.commands = this.compile(mml);
            this.toneGenerator = new PwmGenerator();
            this.toneParams128 = Array(128);
        }

        MMLTrack.prototype.compile = function(mml) {
            var cmd, m, mask;
            var commands = [];
            var checked = {};

            for (var i = 0, imax = MMLCommands.length; i < imax; i++) {
                var def = MMLCommands[i];

                while ((m = def.re.exec(mml)) !== null) {
                    if (!checked[m.index]) {
                        checked[m.index] = true;

                        cmd = def.func(m);
                        cmd.index = m.index;
                        cmd.origin = m[0];

                        commands.push(cmd);

                        mask = repeat(m[0].length, " ");

                        mml = mml.substr(0, m.index) + mask + mml.substr(m.index + mask.length);
                    }
                }
            }

            commands.sort(function(a, b) {
                return a.index - b.index;
            });

            return commands;
        };

        MMLTrack.prototype.doCommand = function(cmd) {
            if (!cmd) {
                return;
            }

            var peek;

            switch (cmd.name) {
                case "#FM2OP@":
                    this.toneParams128[cmd.val[0]] = cmd.val;
                    break;
                case "#WAVB":
                    this.toneParams128[cmd.val[0]] = cmd.val[1];
                    break;
                case "@":
                    if (       this.toneParams128[cmd.val] && this.toneParams128[cmd.val].length ==  5) {
                      this.toneGenerator = new FM2OP(this.toneParams128[cmd.val]);
                    } else if (this.toneParams128[cmd.val] && this.toneParams128[cmd.val].length == 32) {
                      this.toneGenerator = new WaveMemory32(this.toneParams128[cmd.val]);
                    } else {
                      switch (cmd.val) {
                          case 3:
                              this.toneGenerator = new PwmGenerator();
                              break;
                          case 4:
                              this.toneGenerator = new NoiseGenerator();
                              break;
                          case 5:
                              this.toneGenerator = new FMSynthBass();
                              break;
                          case 6:
                              this.toneGenerator = new FMSynthLead();
                              break;
                      }
                    }
                    break;
                case "@w":
                    if (this.toneGenerator && this.toneGenerator.setWidth) {
                        this.toneGenerator.setWidth(cmd.val);
                    }
                    break;
                case "@n":
                    if (this.toneGenerator && this.toneGenerator.setNoise) {
                        this.toneGenerator.setNoise(cmd.val);
                    }
                    break;
                case "@e1":
                    if (this.toneGenerator && this.toneGenerator.setParams) {
                        this.toneGenerator.setParams(cmd.val);
                    }
                    break;
                case "t":
                    this.tempo = cmd.val;
                    break;
                case "l":
                    this.len = cmd.val;
                    break;
                case "o":
                    this.octave = cmd.val;
                    break;
                case "kt":
                    this.keyTranspose = cmd.val;
                    break;
                case "<":
                    this.octave += 1;
                    break;
                case ">":
                    this.octave -= 1;
                    break;
                case "&":
                    this.tie = true;
                    break;
                case "/:":
                    this.loopStack.push({
                        index: this.index,
                        count: cmd.val || 2,
                        exit: 0
                    });
                    break;
                case ":/":
                    peek = this.loopStack[this.loopStack.length - 1];
                    peek.exit = this.index;
                    peek.count -= 1;
                    if (peek.count <= 0) {
                        this.loopStack.pop();
                    } else {
                        this.index = peek.index;
                    }
                    break;
                case "/":
                    peek = this.loopStack[this.loopStack.length - 1];
                    if (peek.count === 1) {
                        this.loopStack.pop();
                        this.index = peek.exit;
                    }
                    break;
                case "v":
                    this.toneGenerator.setVelocity(cmd.val);
                    break;
                case "note":
                case "rest":
                    var len = cmd.len || this.len;
                    this.samples += ((60 / this.tempo) * (4 / len) * this.sampleRate) | 0;
                    this.samples *= [1, 1.5, 1.75][cmd.dot] || 1;

                    var freq = (cmd.name === "rest") ? 0 : midicps(cmd.tone + this.octave * 12 + this.keyTranspose);

                    if (this.curFreq !== freq) {
                        this.tie = false;
                    }

                    if (!this.tie) {
                        this.toneGenerator.setFreq(freq);
                        this.curFreq = freq;
                    } else {
                        this.tie = false;
                    }

                    break;
            }
        };

        MMLTrack.prototype.process = function() {
            while (this.samples <= 0) {
                this.index += 1;
                if (this.index >= this.commands.length) {
                    this.samples = Infinity;
                } else {
                    this.doCommand(this.commands[this.index]);
                }
            }

            this.samples -= Pico.bufferSize;

            if (this.samples !== Infinity && this.toneGenerator) {
                return this.toneGenerator.process();
            }
        };

        return MMLTrack;
    })();

    var MMLSequencer = (function() {
        function MMLSequencer(mml) {
            var preprocessor = require("./sion-preprocess");
            mml = preprocessor(mml);
            
            this.tracks = mml.split(";").filter(function(mml) {
                return mml;
            }).map(function(mml) {
                return new MMLTrack(mml);
            });
            this.cell = new Float32Array(Pico.bufferSize);
        }

        MMLSequencer.prototype.process = function() {
            this.cell.set(new Float32Array(this.cell.length));

            this.tracks.forEach(function(track) {
                var cell = track.process();
                if (cell) {
                    for (var i = 0, imax = this.cell.length; i < imax; i++) {
                        this.cell[i] += cell[i];
                    }
                }
            }, this);

            return this.cell;
        };

        return MMLSequencer;
    })();

    function toInt(x) {
        return x | 0;
    }


    var MMLCommands = [
        {
            re: /\#FM2OP@(\d+,\d+,\d+,\d+,\d+)/g,
            func: function(m) {
                return { name: "#FM2OP@", val: m[1].split(",").map(toInt) };
            }
        },
        {
            re: /@e1,(\d+,\d+,\d+,\d+)/g,
            func: function(m) {
                return { name: "@e1", val: m[1].split(",").map(toInt) };
            }
        },
        {
            re: /@w(\d*)/g,
            func: function(m) {
                return { name: "@w", val: toInt(m[1]) };
            }
        },
        {
            re: /@n(\d*)/g,
            func: function(m) {
                return { name: "@n", val: toInt(m[1]) };
            }
        },
        {
            re: /@(\d*)/g,
            func: function(m) {
                return { name: "@", val: toInt(m[1]) };
            }
        },
        {
            re: /kt(\d*)/g,
            func: function(m) {
                return { name: "kt", val: toInt(m[1]) };
            }
        },
        {
            re: /t(\d*)/g,
            func: function(m) {
                return { name: "t", val: toInt(m[1]) };
            }
        },
        {
            re: /l(\d*)/g,
            func: function(m) {
                return { name: "l", val: toInt(m[1]) };
            }
        },
        {
            re: /v(\d*)/g,
            func: function(m) {
                return { name: "v", val: toInt(m[1]) };
            }
        },
        {
            re: /o(\d*)/g,
            func: function(m) {
                return { name: "o", val: toInt(m[1]) };
            }
        },
        {
            re: /[<>]/g,
            func: function(m) {
                return { name: m[0] };
            }
        },
        {
            re: /\/:(\d*)/g,
            func: function(m) {
                return { name: "/:", val: toInt(m[1]) };
            }
        },
        {
            re: /:\//g,
            func: function(m) {
                return { name: ":/" };
            }
        },
        {
            re: /\//g,
            func: function(m) {
                return { name: "/" };
            }
        },
        {
            re: /([cdefgab])([-+]?)(\d*)(\.*)/g,
            func: function(m) {
                return {
                    name: "note",
                    note: m[1],
                    len: toInt(m[3]),
                    dot: m[4].length,
                    tone: {
                        c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11
                    }[m[1]] + toInt({
                        "-": -1,
                        "+": +1
                    }[m[2]])
                };
            }
        },
        {
            re: /([r])([-+]?)(\d*)(\.*)/g,
            func: function(m) {
                return { name: "rest", note: m[1], len: toInt(m[3]), dot: m[4].length };
            }
        },
        {
            re: /&/g,
            func: function(m) {
                return { name: "&" };
            }
        }
    ];
    
    var SionPreAdapter  = require("./sion-pre-adapter");
    var SionPostAdapter = require("./sion-post-adapter");
    var MMLCommands = SionPreAdapter.concat(MMLCommands).concat(SionPostAdapter);

    var sequencer = new MMLSequencer(mmldata);

    return function(e) {
        var cell = sequencer.process();

        e.buffers[0].set(cell);
        e.buffers[1].set(cell);
    }
}

module.exports = Sionic;
},{"./sion-post-adapter":3,"./sion-pre-adapter":4,"./sion-preprocess":5}],3:[function(require,module,exports){
module.exports = [
    {
        re: /#[A-Z0-9 @]+{[^}]+}/g,
        func: function(m) {
            //SiON driver commands
            // like #OPM or #EFFECT0
            //Do nothing
            return { name: "sion commands" };
        }
    }
]
},{}],4:[function(require,module,exports){
module.exports = [
    {
        re: /\/\*[^\*]*\*\//g,
        func: function(m) {
            //C style Comments
            //Do nothing
            return { name: "comments" };
        }
    },
    {
        re: /kt\-(\d*)/g,
        func: function(m) {
            return { name: "kt", val: - toInt(m[1]) };
        }
    },
    {
        re: /\#WAVB(\d+)\{([0-9A-Fa-f]{64})\}/g,
        func: function(m) {
            return { name: "#WAVB", val: [m[1], m[2].match(/.{2}/g).map(hexToInt8)] };

            function hexToInt8(x) {
              return Int8Array.from([parseInt(x,16)])[0];
            }
        }
    },

]
},{}],5:[function(require,module,exports){
module.exports = function(mml){
    //最初に見つかったテンポ表記を全トラックに適用する
    var found = mml.match(/^kt([0-9]+)/);
    
    if(found && found[1]){
        mml = ""+mml.split(";").map(function(track){
            return "t" + found[1] + track;
        }).join(";");
    }
    return mml;
}
},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9tbWwuanMiLCJsaWIvc2lvbi1wb3N0LWFkYXB0ZXIuanMiLCJsaWIvc2lvbi1wcmUtYWRhcHRlci5qcyIsImxpYi9zaW9uLXByZXByb2Nlc3MuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcHRCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vbGliL21tbFwiKTtcclxuIiwiLy8gT3JpZ2luYWwgc291cmNlIGFyZSB3cml0dGVuIGJ5IG1vaGF5b25hbyBcclxuLy8gaHR0cHM6Ly9naXRodWIuY29tL21vaGF5b25hby9waWNvLmpzL2Jsb2IvbWFzdGVyL2V4YW1wbGVzL2RlbW8uanNcclxuXHJcbi8vIE1vZGlmeSBieSBtaW5pcG9wLCB0byB1c2UgYXMgYSBsaWJyYXJ5LlxyXG4vLyBNSVQgbGljZW5zZS4gc2VlOiBodHRwczovL2dpdGh1Yi5jb20vbW9oYXlvbmFvL3BpY28uanNcclxuXHJcbmZ1bmN0aW9uIFNpb25pYyhtbWxkYXRhKSB7XHJcbiAgICBcInVzZSBzdHJpY3RcIjtcclxuXHJcbiAgICBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcclxuICAgICAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xyXG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogeyB2YWx1ZTogY3RvciB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcmVwZWF0KG4sIGNoKSB7XHJcbiAgICAgICAgdmFyIHN0ciA9IFwiXCI7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcclxuICAgICAgICAgICAgc3RyICs9IGNoO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gc3RyO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG1pZGljcHMobWlkaSkge1xyXG4gICAgICAgIHJldHVybiA0NDAgKiBNYXRoLnBvdygyLCAobWlkaSAtIDY5KSAvIDEyKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgVG9uZUdlbmVyYXRvciA9IChmdW5jdGlvbigpIHtcclxuICAgICAgICBmdW5jdGlvbiBUb25lR2VuZXJhdG9yKCkge1xyXG4gICAgICAgICAgICB0aGlzLnNhbXBsZVJhdGUgPSBQaWNvLnNhbXBsZVJhdGU7XHJcbiAgICAgICAgICAgIHRoaXMudmVsb2NpdHkgPSAwLjg7XHJcbiAgICAgICAgICAgIHRoaXMuY2VsbCA9IG5ldyBGbG9hdDMyQXJyYXkoUGljby5idWZmZXJTaXplKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIFRvbmVHZW5lcmF0b3IucHJvdG90eXBlLnNldFZlbG9jaXR5ID0gZnVuY3Rpb24odmFsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnZlbG9jaXR5ID0gdmFsIC8gMTY7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgVG9uZUdlbmVyYXRvci5wcm90b3R5cGUuc2V0UGFyYW1zID0gZnVuY3Rpb24odmFsKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmVudikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5lbnYuc2V0UGFyYW1zKHZhbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gVG9uZUdlbmVyYXRvcjtcclxuICAgIH0pKCk7XHJcblxyXG4gICAgdmFyIEZNMk9QID0gKGZ1bmN0aW9uKGZtUGFyYW1zKSB7XHJcbiAgICAgICAgZnVuY3Rpb24gRk0yT1AoZm1QYXJhbXMpIHtcclxuICAgICAgICAgICAgVG9uZUdlbmVyYXRvci5jYWxsKHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLm9wID0gW1xyXG4gICAgICAgICAgICAgICAgeyBwaGFzZTogMCwgcGhhc2VJbmNyOiAwLCBhbXA6IDEgfSxcclxuICAgICAgICAgICAgICAgIHsgcGhhc2U6IDAsIHBoYXNlSW5jcjogMCwgYW1wOiAxIH0sXHJcbiAgICAgICAgICAgIF07XHJcbiAgICAgICAgICAgIHRoaXMuZmIgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLmZibHYgICAgICAgICAgICAgID0gZm1QYXJhbXNbMV0gLyAxMDAwLjA7XHJcbiAgICAgICAgICAgIHRoaXMubW9kdWxhdG9yRGVjYXkgICAgPSBmbVBhcmFtc1syXSAvIDEwMDAuMDtcclxuICAgICAgICAgICAgdGhpcy5tb2R1bGF0b3JBbXAgICAgICA9IGZtUGFyYW1zWzNdIC8gMTAwMC4wO1xyXG4gICAgICAgICAgICB0aGlzLm1vZHVsYXRvck11bHRpcGxlID0gZm1QYXJhbXNbNF0gLyAxMDAwLjA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGluaGVyaXRzKEZNMk9QLCBUb25lR2VuZXJhdG9yKTtcclxuXHJcbiAgICAgICAgRk0yT1AucHJvdG90eXBlLnNldEZyZXEgPSBmdW5jdGlvbih2YWwpIHtcclxuICAgICAgICAgICAgdGhpcy5vcFswXS5waGFzZUluY3IgPSB2YWwgLyB0aGlzLnNhbXBsZVJhdGUgKiB0aGlzLm1vZHVsYXRvck11bHRpcGxlO1xyXG4gICAgICAgICAgICB0aGlzLm9wWzFdLnBoYXNlSW5jciA9IHZhbCAvIHRoaXMuc2FtcGxlUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5vcFswXS5hbXAgPSB0aGlzLm1vZHVsYXRvckFtcDtcclxuICAgICAgICAgICAgdGhpcy5vcFsxXS5hbXAgPSAxO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIEZNMk9QLnByb3RvdHlwZS5wcm9jZXNzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBvcCA9IHRoaXMub3A7XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaW1heCA9IHRoaXMuY2VsbC5sZW5ndGg7IGkgPCBpbWF4OyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBwaGFzZTAgPSBvcFswXS5waGFzZSArIHRoaXMuZmIgKiB0aGlzLmZibHY7XHJcbiAgICAgICAgICAgICAgICB2YXIgeDAgPSBNYXRoLnNpbihwaGFzZTAgKiAyICogTWF0aC5QSSkgKiBvcFswXS5hbXA7XHJcbiAgICAgICAgICAgICAgICB2YXIgcGhhc2UxID0gb3BbMV0ucGhhc2UgKyB4MDtcclxuICAgICAgICAgICAgICAgIHZhciB4MSA9IE1hdGguc2luKHBoYXNlMSAqIDIgKiBNYXRoLlBJKSAqIG9wWzFdLmFtcDtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2VsbFtpXSA9IHgxICogdGhpcy52ZWxvY2l0eSAqIDAuMTU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZiID0geDA7XHJcbiAgICAgICAgICAgICAgICBvcFswXS5waGFzZSArPSBvcFswXS5waGFzZUluY3I7XHJcbiAgICAgICAgICAgICAgICBvcFsxXS5waGFzZSArPSBvcFsxXS5waGFzZUluY3I7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIG9wWzBdLmFtcCAqPSB0aGlzLm1vZHVsYXRvckRlY2F5O1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2VsbDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gRk0yT1A7XHJcbiAgICB9KSgpO1xyXG5cclxuICAgIHZhciBXYXZlTWVtb3J5MzIgPSAoZnVuY3Rpb24od2F2ZVRhYmxlMzIpIHtcclxuICAgICAgICBmdW5jdGlvbiBXYXZlTWVtb3J5MzIod2F2ZVRhYmxlMzIpIHtcclxuICAgICAgICAgICAgVG9uZUdlbmVyYXRvci5jYWxsKHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLmVudiA9IG5ldyBFbnZlbG9wZSgpO1xyXG4gICAgICAgICAgICB0aGlzLnBoYXNlID0gMDtcclxuICAgICAgICAgICAgdGhpcy5waGFzZUluY3IgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLndhdmVUYWJsZTMyID0gd2F2ZVRhYmxlMzI7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzI7IGkrKykge1xyXG4gICAgICAgICAgICAgIHRoaXMud2F2ZVRhYmxlMzJbaV0gLz0gMTI4MDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpbmhlcml0cyhXYXZlTWVtb3J5MzIsIFRvbmVHZW5lcmF0b3IpO1xyXG5cclxuICAgICAgICBXYXZlTWVtb3J5MzIucHJvdG90eXBlLnNldEZyZXEgPSBmdW5jdGlvbih2YWwpIHtcclxuICAgICAgICAgICAgdGhpcy5waGFzZUluY3IgPSB2YWwgLyB0aGlzLnNhbXBsZVJhdGU7XHJcbiAgICAgICAgICAgIHRoaXMuZW52LmJhbmcoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBXYXZlTWVtb3J5MzIucHJvdG90eXBlLnByb2Nlc3MgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGltYXggPSB0aGlzLmNlbGwubGVuZ3RoOyBpIDwgaW1heDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNlbGxbaV0gPSB0aGlzLndhdmVUYWJsZTMyW01hdGguZmxvb3IodGhpcy5waGFzZSAqIDMyKV0gKiB0aGlzLnZlbG9jaXR5O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5waGFzZSArPSB0aGlzLnBoYXNlSW5jcjtcclxuICAgICAgICAgICAgICAgIHdoaWxlICh0aGlzLnBoYXNlID49IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBoYXNlID0gMDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmVudi5wcm9jZXNzKHRoaXMuY2VsbCk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jZWxsO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiBXYXZlTWVtb3J5MzI7XHJcbiAgICB9KSgpO1xyXG5cclxuICAgIHZhciBGTVN5bnRoQmFzcyA9IChmdW5jdGlvbigpIHtcclxuICAgICAgICBmdW5jdGlvbiBGTVN5bnRoQmFzcygpIHtcclxuICAgICAgICAgICAgVG9uZUdlbmVyYXRvci5jYWxsKHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLm9wID0gW1xyXG4gICAgICAgICAgICAgICAgeyBwaGFzZTogMCwgcGhhc2VJbmNyOiAwLCBhbXA6IDEgfSxcclxuICAgICAgICAgICAgICAgIHsgcGhhc2U6IDAsIHBoYXNlSW5jcjogMCwgYW1wOiAxIH0sXHJcbiAgICAgICAgICAgIF07XHJcbiAgICAgICAgICAgIHRoaXMuZmIgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLmZibHYgPSAwLjA5NztcclxuICAgICAgICB9XHJcbiAgICAgICAgaW5oZXJpdHMoRk1TeW50aEJhc3MsIFRvbmVHZW5lcmF0b3IpO1xyXG5cclxuICAgICAgICBGTVN5bnRoQmFzcy5wcm90b3R5cGUuc2V0RnJlcSA9IGZ1bmN0aW9uKHZhbCkge1xyXG4gICAgICAgICAgICB0aGlzLm9wWzBdLnBoYXNlSW5jciA9IHZhbCAvIHRoaXMuc2FtcGxlUmF0ZSAqIDAuNTtcclxuICAgICAgICAgICAgdGhpcy5vcFsxXS5waGFzZUluY3IgPSB2YWwgLyB0aGlzLnNhbXBsZVJhdGU7XHJcbiAgICAgICAgICAgIHRoaXMub3BbMF0uYW1wID0gMC43NTtcclxuICAgICAgICAgICAgdGhpcy5vcFsxXS5hbXAgPSAxO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIEZNU3ludGhCYXNzLnByb3RvdHlwZS5wcm9jZXNzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBvcCA9IHRoaXMub3A7XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaW1heCA9IHRoaXMuY2VsbC5sZW5ndGg7IGkgPCBpbWF4OyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBwaGFzZTAgPSBvcFswXS5waGFzZSArIHRoaXMuZmIgKiB0aGlzLmZibHY7XHJcbiAgICAgICAgICAgICAgICB2YXIgeDAgPSBNYXRoLnNpbihwaGFzZTAgKiAyICogTWF0aC5QSSkgKiBvcFswXS5hbXA7XHJcbiAgICAgICAgICAgICAgICB2YXIgcGhhc2UxID0gb3BbMV0ucGhhc2UgKyB4MDtcclxuICAgICAgICAgICAgICAgIHZhciB4MSA9IE1hdGguc2luKHBoYXNlMSAqIDIgKiBNYXRoLlBJKSAqIG9wWzFdLmFtcDtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2VsbFtpXSA9IHgxICogdGhpcy52ZWxvY2l0eSAqIDAuMTU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZiID0geDA7XHJcbiAgICAgICAgICAgICAgICBvcFswXS5waGFzZSArPSBvcFswXS5waGFzZUluY3I7XHJcbiAgICAgICAgICAgICAgICBvcFsxXS5waGFzZSArPSBvcFsxXS5waGFzZUluY3I7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIG9wWzBdLmFtcCAqPSAwLjk5NTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNlbGw7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuIEZNU3ludGhCYXNzO1xyXG4gICAgfSkoKTtcclxuXHJcbiAgICB2YXIgRk1TeW50aExlYWQgPSAoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgZnVuY3Rpb24gRk1TeW50aExlYWQoKSB7XHJcbiAgICAgICAgICAgIFRvbmVHZW5lcmF0b3IuY2FsbCh0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5vcCA9IFtcclxuICAgICAgICAgICAgICAgIHsgcGhhc2U6IDAsIHBoYXNlSW5jcjogMCwgYW1wOiAxIH0sXHJcbiAgICAgICAgICAgICAgICB7IHBoYXNlOiAwLCBwaGFzZUluY3I6IDAsIGFtcDogMSB9LFxyXG4gICAgICAgICAgICAgICAgeyBwaGFzZTogMCwgcGhhc2VJbmNyOiAwLCBhbXA6IDEgfSxcclxuICAgICAgICAgICAgICAgIHsgcGhhc2U6IDAsIHBoYXNlSW5jcjogMCwgYW1wOiAxIH0sXHJcbiAgICAgICAgICAgIF07XHJcbiAgICAgICAgICAgIHRoaXMuZmIgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLmZibHYgPSAwLjM7XHJcbiAgICAgICAgICAgIHRoaXMuZW52ID0gbmV3IEVudmVsb3BlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGluaGVyaXRzKEZNU3ludGhMZWFkLCBUb25lR2VuZXJhdG9yKTtcclxuXHJcbiAgICAgICAgRk1TeW50aExlYWQucHJvdG90eXBlLnNldEZyZXEgPSBmdW5jdGlvbih2YWwpIHtcclxuICAgICAgICAgICAgdGhpcy5vcFswXS5waGFzZUluY3IgPSB2YWwgLyB0aGlzLnNhbXBsZVJhdGUgKiAyO1xyXG4gICAgICAgICAgICB0aGlzLm9wWzFdLnBoYXNlSW5jciA9IHZhbCAvIHRoaXMuc2FtcGxlUmF0ZSAqIDE7XHJcbiAgICAgICAgICAgIHRoaXMub3BbMl0ucGhhc2VJbmNyID0gdmFsIC8gdGhpcy5zYW1wbGVSYXRlICogNDtcclxuICAgICAgICAgICAgdGhpcy5vcFszXS5waGFzZUluY3IgPSB2YWwgLyB0aGlzLnNhbXBsZVJhdGUgKiAxLjAwNTtcclxuICAgICAgICAgICAgdGhpcy5vcFswXS5hbXAgPSAwLjU7XHJcbiAgICAgICAgICAgIHRoaXMub3BbMV0uYW1wID0gMjtcclxuICAgICAgICAgICAgdGhpcy5vcFsyXS5hbXAgPSA0O1xyXG4gICAgICAgICAgICB0aGlzLm9wWzNdLmFtcCA9IDAuNTtcclxuICAgICAgICAgICAgdGhpcy5lbnYuYmFuZygpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIEZNU3ludGhMZWFkLnByb3RvdHlwZS5wcm9jZXNzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBvcCA9IHRoaXMub3A7XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaW1heCA9IHRoaXMuY2VsbC5sZW5ndGg7IGkgPCBpbWF4OyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBwaGFzZTAgPSBvcFswXS5waGFzZSArIHRoaXMuZmIgKiB0aGlzLmZibHY7XHJcbiAgICAgICAgICAgICAgICB2YXIgeDAgPSBNYXRoLnNpbihwaGFzZTAgKiAyICogTWF0aC5QSSkgKiBvcFswXS5hbXA7XHJcbiAgICAgICAgICAgICAgICB2YXIgcGhhc2UxID0gb3BbMV0ucGhhc2UgKyB4MDtcclxuICAgICAgICAgICAgICAgIHZhciB4MSA9IE1hdGguc2luKHBoYXNlMSAqIDIgKiBNYXRoLlBJKSAqIG9wWzFdLmFtcDtcclxuICAgICAgICAgICAgICAgIHZhciBwaGFzZTIgPSBvcFsyXS5waGFzZTtcclxuICAgICAgICAgICAgICAgIHZhciB4MiA9IE1hdGguc2luKHBoYXNlMiAqIDIgKiBNYXRoLlBJKSAqIG9wWzJdLmFtcDtcclxuICAgICAgICAgICAgICAgIHZhciBwaGFzZTMgPSBvcFszXS5waGFzZSArIHgyO1xyXG4gICAgICAgICAgICAgICAgdmFyIHgzID0gTWF0aC5zaW4ocGhhc2UzICogMiAqIE1hdGguUEkpICogb3BbM10uYW1wO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jZWxsW2ldID0gKHgxICsgeDMpICogdGhpcy52ZWxvY2l0eSAqIDAuMTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZmIgPSB4MDtcclxuICAgICAgICAgICAgICAgIG9wWzBdLnBoYXNlICs9IG9wWzBdLnBoYXNlSW5jcjtcclxuICAgICAgICAgICAgICAgIG9wWzFdLnBoYXNlICs9IG9wWzFdLnBoYXNlSW5jcjtcclxuICAgICAgICAgICAgICAgIG9wWzJdLnBoYXNlICs9IG9wWzJdLnBoYXNlSW5jcjtcclxuICAgICAgICAgICAgICAgIG9wWzNdLnBoYXNlICs9IG9wWzNdLnBoYXNlSW5jcjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgb3BbMF0uYW1wICo9IDAuOTk4ODtcclxuICAgICAgICAgICAgb3BbMl0uYW1wICo9IDAuOTk5ODtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZW52LnByb2Nlc3ModGhpcy5jZWxsKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2VsbDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gRk1TeW50aExlYWQ7XHJcbiAgICB9KSgpO1xyXG5cclxuICAgIHZhciBQd21HZW5lcmF0b3IgPSAoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgZnVuY3Rpb24gUHdtR2VuZXJhdG9yKCkge1xyXG4gICAgICAgICAgICBUb25lR2VuZXJhdG9yLmNhbGwodGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMuZW52ID0gbmV3IEVudmVsb3BlKCk7XHJcbiAgICAgICAgICAgIHRoaXMucGhhc2UgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLnBoYXNlSW5jciA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMud2lkdGggPSAwLjU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGluaGVyaXRzKFB3bUdlbmVyYXRvciwgVG9uZUdlbmVyYXRvcik7XHJcblxyXG4gICAgICAgIFB3bUdlbmVyYXRvci5wcm90b3R5cGUuc2V0RnJlcSA9IGZ1bmN0aW9uKHZhbCkge1xyXG4gICAgICAgICAgICB0aGlzLnBoYXNlSW5jciA9IHZhbCAvIHRoaXMuc2FtcGxlUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5lbnYuYmFuZygpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIFB3bUdlbmVyYXRvci5wcm90b3R5cGUuc2V0V2lkdGggPSBmdW5jdGlvbih2YWwpIHtcclxuICAgICAgICAgICAgdGhpcy53aWR0aCA9IHZhbCAqIDAuMDE7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgUHdtR2VuZXJhdG9yLnByb3RvdHlwZS5wcm9jZXNzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpbWF4ID0gdGhpcy5jZWxsLmxlbmd0aDsgaSA8IGltYXg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jZWxsW2ldID0gKHRoaXMucGhhc2UgPCB0aGlzLndpZHRoID8gKzAuMSA6IC0wLjEpICogdGhpcy52ZWxvY2l0eTtcclxuICAgICAgICAgICAgICAgIHRoaXMucGhhc2UgKz0gdGhpcy5waGFzZUluY3I7XHJcbiAgICAgICAgICAgICAgICB3aGlsZSAodGhpcy5waGFzZSA+PSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5waGFzZSAtPSAxO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmVudi5wcm9jZXNzKHRoaXMuY2VsbCk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jZWxsO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiBQd21HZW5lcmF0b3I7XHJcbiAgICB9KSgpO1xyXG5cclxuICAgIHZhciBOb2lzZUdlbmVyYXRvciA9IChmdW5jdGlvbigpIHtcclxuICAgICAgICBmdW5jdGlvbiBOb2lzZUdlbmVyYXRvcigpIHtcclxuICAgICAgICAgICAgVG9uZUdlbmVyYXRvci5jYWxsKHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLmVudiA9IG5ldyBFbnZlbG9wZSgpO1xyXG4gICAgICAgICAgICB0aGlzLnBoYXNlID0gMDtcclxuICAgICAgICAgICAgdGhpcy5waGFzZUluY3IgPSAxO1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gMDtcclxuICAgICAgICAgICAgdGhpcy5vbk9mZiA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGluaGVyaXRzKE5vaXNlR2VuZXJhdG9yLCBUb25lR2VuZXJhdG9yKTtcclxuXHJcbiAgICAgICAgTm9pc2VHZW5lcmF0b3IucHJvdG90eXBlLnNldEZyZXEgPSBmdW5jdGlvbih2YWwpIHtcclxuICAgICAgICAgICAgdGhpcy5vbk9mZiA9IHZhbCA/IDAuMTUgOiAwO1xyXG4gICAgICAgICAgICB0aGlzLmVudi5iYW5nKCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgTm9pc2VHZW5lcmF0b3IucHJvdG90eXBlLnNldE5vaXNlID0gZnVuY3Rpb24odmFsKSB7XHJcbiAgICAgICAgICAgIGlmICh2YWwgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBoYXNlSW5jciA9IDQgLyB2YWw7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBoYXNlSW5jciA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBOb2lzZUdlbmVyYXRvci5wcm90b3R5cGUucHJvY2VzcyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaW1heCA9IHRoaXMuY2VsbC5sZW5ndGg7IGkgPCBpbWF4OyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2VsbFtpXSA9IHRoaXMudmFsdWUgKiB0aGlzLm9uT2ZmO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5waGFzZSArPSB0aGlzLnBoYXNlSW5jcjtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBoYXNlID49IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBoYXNlIC09IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52YWx1ZSA9IE1hdGgucmFuZG9tKCkgKiB0aGlzLnZlbG9jaXR5O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmVudi5wcm9jZXNzKHRoaXMuY2VsbCk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jZWxsO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiBOb2lzZUdlbmVyYXRvcjtcclxuICAgIH0pKCk7XHJcblxyXG4gICAgdmFyIEVudmVsb3BlID0gKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIEVudmVsb3BlKCkge1xyXG4gICAgICAgICAgICB0aGlzLnNhbXBsZVJhdGUgPSBQaWNvLnNhbXBsZVJhdGU7XHJcbiAgICAgICAgICAgIHRoaXMuYSA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMuZCA9IDY0O1xyXG4gICAgICAgICAgICB0aGlzLnMgPSAzMjtcclxuICAgICAgICAgICAgdGhpcy5yID0gMDtcclxuICAgICAgICAgICAgdGhpcy5zYW1wbGVzID0gMDtcclxuICAgICAgICAgICAgdGhpcy5zdGF0dXMgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLnggPSAxO1xyXG4gICAgICAgICAgICB0aGlzLmR4ID0gMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIEVudmVsb3BlLnByb3RvdHlwZS5zZXRQYXJhbXMgPSBmdW5jdGlvbihwYXJhbXMpIHtcclxuICAgICAgICAgICAgdGhpcy5hID0gcGFyYW1zWzBdO1xyXG4gICAgICAgICAgICB0aGlzLmQgPSBwYXJhbXNbMV07XHJcbiAgICAgICAgICAgIHRoaXMucyA9IHBhcmFtc1syXTtcclxuICAgICAgICAgICAgdGhpcy5yID0gcGFyYW1zWzNdO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIEVudmVsb3BlLnByb3RvdHlwZS5iYW5nID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2FtcGxlcyA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdHVzID0gMDtcclxuICAgICAgICAgICAgdGhpcy54ID0gMTtcclxuICAgICAgICAgICAgdGhpcy5keCA9IDA7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgRW52ZWxvcGUucHJvdG90eXBlLnByb2Nlc3MgPSBmdW5jdGlvbihjZWxsKSB7XHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnNhbXBsZXMgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoICh0aGlzLnN0YXR1cykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0dXMgPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNhbXBsZXMgPSAodGhpcy5hICogMC4wMDUpICogdGhpcy5zYW1wbGVSYXRlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnggPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmR4ID0gKDEgLyB0aGlzLnNhbXBsZXMpICogY2VsbC5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0dXMgPSAyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNhbXBsZXMgPSAodGhpcy5kICogMC4wMDUpICogdGhpcy5zYW1wbGVSYXRlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnggPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmR4ID0gLSgxIC8gdGhpcy5zYW1wbGVzKSAqIGNlbGwubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmR4ICo9ICgxIC0gdGhpcy5zIC8gMTI4KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXR1cyA9IDM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2FtcGxlcyA9IEluZmluaXR5O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmR4ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucyA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy54ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaW1heCA9IGNlbGwubGVuZ3RoOyBpIDwgaW1heDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBjZWxsW2ldICo9IHRoaXMueDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy54ICs9IHRoaXMuZHg7XHJcbiAgICAgICAgICAgIHRoaXMuc2FtcGxlcyAtPSBjZWxsLmxlbmd0aDtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBjZWxsO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiBFbnZlbG9wZTtcclxuICAgIH0pKCk7XHJcblxyXG4gICAgdmFyIE1NTFRyYWNrID0gKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIE1NTFRyYWNrKG1tbCkge1xyXG4gICAgICAgICAgICB0aGlzLnNhbXBsZVJhdGUgPSBQaWNvLnNhbXBsZVJhdGU7XHJcbiAgICAgICAgICAgIHRoaXMudGVtcG8gPSAxMjA7XHJcbiAgICAgICAgICAgIHRoaXMubGVuID0gNDtcclxuICAgICAgICAgICAgdGhpcy5vY3RhdmUgPSA1O1xyXG4gICAgICAgICAgICB0aGlzLmtleVRyYW5zcG9zZSA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMudGllID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuY3VyRnJlcSA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMuaW5kZXggPSAtMTtcclxuICAgICAgICAgICAgdGhpcy5zYW1wbGVzID0gMDtcclxuICAgICAgICAgICAgdGhpcy5sb29wU3RhY2sgPSBbXTtcclxuICAgICAgICAgICAgdGhpcy5jb21tYW5kcyA9IHRoaXMuY29tcGlsZShtbWwpO1xyXG4gICAgICAgICAgICB0aGlzLnRvbmVHZW5lcmF0b3IgPSBuZXcgUHdtR2VuZXJhdG9yKCk7XHJcbiAgICAgICAgICAgIHRoaXMudG9uZVBhcmFtczEyOCA9IEFycmF5KDEyOCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBNTUxUcmFjay5wcm90b3R5cGUuY29tcGlsZSA9IGZ1bmN0aW9uKG1tbCkge1xyXG4gICAgICAgICAgICB2YXIgY21kLCBtLCBtYXNrO1xyXG4gICAgICAgICAgICB2YXIgY29tbWFuZHMgPSBbXTtcclxuICAgICAgICAgICAgdmFyIGNoZWNrZWQgPSB7fTtcclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpbWF4ID0gTU1MQ29tbWFuZHMubGVuZ3RoOyBpIDwgaW1heDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVmID0gTU1MQ29tbWFuZHNbaV07XHJcblxyXG4gICAgICAgICAgICAgICAgd2hpbGUgKChtID0gZGVmLnJlLmV4ZWMobW1sKSkgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWNoZWNrZWRbbS5pbmRleF0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tlZFttLmluZGV4XSA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbWQgPSBkZWYuZnVuYyhtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY21kLmluZGV4ID0gbS5pbmRleDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY21kLm9yaWdpbiA9IG1bMF07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21tYW5kcy5wdXNoKGNtZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXNrID0gcmVwZWF0KG1bMF0ubGVuZ3RoLCBcIiBcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtbWwgPSBtbWwuc3Vic3RyKDAsIG0uaW5kZXgpICsgbWFzayArIG1tbC5zdWJzdHIobS5pbmRleCArIG1hc2subGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbW1hbmRzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGEuaW5kZXggLSBiLmluZGV4O1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBjb21tYW5kcztcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBNTUxUcmFjay5wcm90b3R5cGUuZG9Db21tYW5kID0gZnVuY3Rpb24oY21kKSB7XHJcbiAgICAgICAgICAgIGlmICghY21kKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBwZWVrO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChjbWQubmFtZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIiNGTTJPUEBcIjpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRvbmVQYXJhbXMxMjhbY21kLnZhbFswXV0gPSBjbWQudmFsO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIiNXQVZCXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50b25lUGFyYW1zMTI4W2NtZC52YWxbMF1dID0gY21kLnZhbFsxXTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJAXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCAgICAgICB0aGlzLnRvbmVQYXJhbXMxMjhbY21kLnZhbF0gJiYgdGhpcy50b25lUGFyYW1zMTI4W2NtZC52YWxdLmxlbmd0aCA9PSAgNSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy50b25lR2VuZXJhdG9yID0gbmV3IEZNMk9QKHRoaXMudG9uZVBhcmFtczEyOFtjbWQudmFsXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnRvbmVQYXJhbXMxMjhbY21kLnZhbF0gJiYgdGhpcy50b25lUGFyYW1zMTI4W2NtZC52YWxdLmxlbmd0aCA9PSAzMikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy50b25lR2VuZXJhdG9yID0gbmV3IFdhdmVNZW1vcnkzMih0aGlzLnRvbmVQYXJhbXMxMjhbY21kLnZhbF0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGNtZC52YWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudG9uZUdlbmVyYXRvciA9IG5ldyBQd21HZW5lcmF0b3IoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRvbmVHZW5lcmF0b3IgPSBuZXcgTm9pc2VHZW5lcmF0b3IoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA1OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRvbmVHZW5lcmF0b3IgPSBuZXcgRk1TeW50aEJhc3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA2OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRvbmVHZW5lcmF0b3IgPSBuZXcgRk1TeW50aExlYWQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIkB3XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudG9uZUdlbmVyYXRvciAmJiB0aGlzLnRvbmVHZW5lcmF0b3Iuc2V0V2lkdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b25lR2VuZXJhdG9yLnNldFdpZHRoKGNtZC52YWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJAblwiOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRvbmVHZW5lcmF0b3IgJiYgdGhpcy50b25lR2VuZXJhdG9yLnNldE5vaXNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudG9uZUdlbmVyYXRvci5zZXROb2lzZShjbWQudmFsKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiQGUxXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudG9uZUdlbmVyYXRvciAmJiB0aGlzLnRvbmVHZW5lcmF0b3Iuc2V0UGFyYW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudG9uZUdlbmVyYXRvci5zZXRQYXJhbXMoY21kLnZhbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcInRcIjpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRlbXBvID0gY21kLnZhbDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJsXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sZW4gPSBjbWQudmFsO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIm9cIjpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9jdGF2ZSA9IGNtZC52YWw7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwia3RcIjpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmtleVRyYW5zcG9zZSA9IGNtZC52YWw7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiPFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2N0YXZlICs9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiPlwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2N0YXZlIC09IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiJlwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGllID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCIvOlwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9vcFN0YWNrLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmRleDogdGhpcy5pbmRleCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IGNtZC52YWwgfHwgMixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhpdDogMFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIjovXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcGVlayA9IHRoaXMubG9vcFN0YWNrW3RoaXMubG9vcFN0YWNrLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgIHBlZWsuZXhpdCA9IHRoaXMuaW5kZXg7XHJcbiAgICAgICAgICAgICAgICAgICAgcGVlay5jb3VudCAtPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwZWVrLmNvdW50IDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sb29wU3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmRleCA9IHBlZWsuaW5kZXg7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIi9cIjpcclxuICAgICAgICAgICAgICAgICAgICBwZWVrID0gdGhpcy5sb29wU3RhY2tbdGhpcy5sb29wU3RhY2subGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlZWsuY291bnQgPT09IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sb29wU3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5kZXggPSBwZWVrLmV4aXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcInZcIjpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRvbmVHZW5lcmF0b3Iuc2V0VmVsb2NpdHkoY21kLnZhbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwibm90ZVwiOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBcInJlc3RcIjpcclxuICAgICAgICAgICAgICAgICAgICB2YXIgbGVuID0gY21kLmxlbiB8fCB0aGlzLmxlbjtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNhbXBsZXMgKz0gKCg2MCAvIHRoaXMudGVtcG8pICogKDQgLyBsZW4pICogdGhpcy5zYW1wbGVSYXRlKSB8IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zYW1wbGVzICo9IFsxLCAxLjUsIDEuNzVdW2NtZC5kb3RdIHx8IDE7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBmcmVxID0gKGNtZC5uYW1lID09PSBcInJlc3RcIikgPyAwIDogbWlkaWNwcyhjbWQudG9uZSArIHRoaXMub2N0YXZlICogMTIgKyB0aGlzLmtleVRyYW5zcG9zZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1ckZyZXEgIT09IGZyZXEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50aWUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy50aWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b25lR2VuZXJhdG9yLnNldEZyZXEoZnJlcSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VyRnJlcSA9IGZyZXE7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50aWUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgTU1MVHJhY2sucHJvdG90eXBlLnByb2Nlc3MgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMuc2FtcGxlcyA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmluZGV4ICs9IDE7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbmRleCA+PSB0aGlzLmNvbW1hbmRzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2FtcGxlcyA9IEluZmluaXR5O1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvQ29tbWFuZCh0aGlzLmNvbW1hbmRzW3RoaXMuaW5kZXhdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zYW1wbGVzIC09IFBpY28uYnVmZmVyU2l6ZTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnNhbXBsZXMgIT09IEluZmluaXR5ICYmIHRoaXMudG9uZUdlbmVyYXRvcikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9uZUdlbmVyYXRvci5wcm9jZXNzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gTU1MVHJhY2s7XHJcbiAgICB9KSgpO1xyXG5cclxuICAgIHZhciBNTUxTZXF1ZW5jZXIgPSAoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgZnVuY3Rpb24gTU1MU2VxdWVuY2VyKG1tbCkge1xyXG4gICAgICAgICAgICB2YXIgcHJlcHJvY2Vzc29yID0gcmVxdWlyZShcIi4vc2lvbi1wcmVwcm9jZXNzXCIpO1xyXG4gICAgICAgICAgICBtbWwgPSBwcmVwcm9jZXNzb3IobW1sKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRoaXMudHJhY2tzID0gbW1sLnNwbGl0KFwiO1wiKS5maWx0ZXIoZnVuY3Rpb24obW1sKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbW1sO1xyXG4gICAgICAgICAgICB9KS5tYXAoZnVuY3Rpb24obW1sKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE1NTFRyYWNrKG1tbCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLmNlbGwgPSBuZXcgRmxvYXQzMkFycmF5KFBpY28uYnVmZmVyU2l6ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBNTUxTZXF1ZW5jZXIucHJvdG90eXBlLnByb2Nlc3MgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdGhpcy5jZWxsLnNldChuZXcgRmxvYXQzMkFycmF5KHRoaXMuY2VsbC5sZW5ndGgpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMudHJhY2tzLmZvckVhY2goZnVuY3Rpb24odHJhY2spIHtcclxuICAgICAgICAgICAgICAgIHZhciBjZWxsID0gdHJhY2sucHJvY2VzcygpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNlbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaW1heCA9IHRoaXMuY2VsbC5sZW5ndGg7IGkgPCBpbWF4OyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jZWxsW2ldICs9IGNlbGxbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCB0aGlzKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNlbGw7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuIE1NTFNlcXVlbmNlcjtcclxuICAgIH0pKCk7XHJcblxyXG4gICAgZnVuY3Rpb24gdG9JbnQoeCkge1xyXG4gICAgICAgIHJldHVybiB4IHwgMDtcclxuICAgIH1cclxuXHJcblxyXG4gICAgdmFyIE1NTENvbW1hbmRzID0gW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmU6IC9cXCNGTTJPUEAoXFxkKyxcXGQrLFxcZCssXFxkKyxcXGQrKS9nLFxyXG4gICAgICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBcIiNGTTJPUEBcIiwgdmFsOiBtWzFdLnNwbGl0KFwiLFwiKS5tYXAodG9JbnQpIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmU6IC9AZTEsKFxcZCssXFxkKyxcXGQrLFxcZCspL2csXHJcbiAgICAgICAgICAgIGZ1bmM6IGZ1bmN0aW9uKG0pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IFwiQGUxXCIsIHZhbDogbVsxXS5zcGxpdChcIixcIikubWFwKHRvSW50KSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJlOiAvQHcoXFxkKikvZyxcclxuICAgICAgICAgICAgZnVuYzogZnVuY3Rpb24obSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogXCJAd1wiLCB2YWw6IHRvSW50KG1bMV0pIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmU6IC9AbihcXGQqKS9nLFxyXG4gICAgICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBcIkBuXCIsIHZhbDogdG9JbnQobVsxXSkgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZTogL0AoXFxkKikvZyxcclxuICAgICAgICAgICAgZnVuYzogZnVuY3Rpb24obSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogXCJAXCIsIHZhbDogdG9JbnQobVsxXSkgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZTogL2t0KFxcZCopL2csXHJcbiAgICAgICAgICAgIGZ1bmM6IGZ1bmN0aW9uKG0pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IFwia3RcIiwgdmFsOiB0b0ludChtWzFdKSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJlOiAvdChcXGQqKS9nLFxyXG4gICAgICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBcInRcIiwgdmFsOiB0b0ludChtWzFdKSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJlOiAvbChcXGQqKS9nLFxyXG4gICAgICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBcImxcIiwgdmFsOiB0b0ludChtWzFdKSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJlOiAvdihcXGQqKS9nLFxyXG4gICAgICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBcInZcIiwgdmFsOiB0b0ludChtWzFdKSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJlOiAvbyhcXGQqKS9nLFxyXG4gICAgICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBcIm9cIiwgdmFsOiB0b0ludChtWzFdKSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJlOiAvWzw+XS9nLFxyXG4gICAgICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBtWzBdIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmU6IC9cXC86KFxcZCopL2csXHJcbiAgICAgICAgICAgIGZ1bmM6IGZ1bmN0aW9uKG0pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IFwiLzpcIiwgdmFsOiB0b0ludChtWzFdKSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJlOiAvOlxcLy9nLFxyXG4gICAgICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBcIjovXCIgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZTogL1xcLy9nLFxyXG4gICAgICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBcIi9cIiB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJlOiAvKFtjZGVmZ2FiXSkoWy0rXT8pKFxcZCopKFxcLiopL2csXHJcbiAgICAgICAgICAgIGZ1bmM6IGZ1bmN0aW9uKG0pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJub3RlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbm90ZTogbVsxXSxcclxuICAgICAgICAgICAgICAgICAgICBsZW46IHRvSW50KG1bM10pLFxyXG4gICAgICAgICAgICAgICAgICAgIGRvdDogbVs0XS5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgdG9uZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjOiAwLCBkOiAyLCBlOiA0LCBmOiA1LCBnOiA3LCBhOiA5LCBiOiAxMVxyXG4gICAgICAgICAgICAgICAgICAgIH1bbVsxXV0gKyB0b0ludCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiLVwiOiAtMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCIrXCI6ICsxXHJcbiAgICAgICAgICAgICAgICAgICAgfVttWzJdXSlcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmU6IC8oW3JdKShbLStdPykoXFxkKikoXFwuKikvZyxcclxuICAgICAgICAgICAgZnVuYzogZnVuY3Rpb24obSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogXCJyZXN0XCIsIG5vdGU6IG1bMV0sIGxlbjogdG9JbnQobVszXSksIGRvdDogbVs0XS5sZW5ndGggfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZTogLyYvZyxcclxuICAgICAgICAgICAgZnVuYzogZnVuY3Rpb24obSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogXCImXCIgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIF07XHJcbiAgICBcclxuICAgIHZhciBTaW9uUHJlQWRhcHRlciAgPSByZXF1aXJlKFwiLi9zaW9uLXByZS1hZGFwdGVyXCIpO1xyXG4gICAgdmFyIFNpb25Qb3N0QWRhcHRlciA9IHJlcXVpcmUoXCIuL3Npb24tcG9zdC1hZGFwdGVyXCIpO1xyXG4gICAgdmFyIE1NTENvbW1hbmRzID0gU2lvblByZUFkYXB0ZXIuY29uY2F0KE1NTENvbW1hbmRzKS5jb25jYXQoU2lvblBvc3RBZGFwdGVyKTtcclxuXHJcbiAgICB2YXIgc2VxdWVuY2VyID0gbmV3IE1NTFNlcXVlbmNlcihtbWxkYXRhKTtcclxuXHJcbiAgICByZXR1cm4gZnVuY3Rpb24oZSkge1xyXG4gICAgICAgIHZhciBjZWxsID0gc2VxdWVuY2VyLnByb2Nlc3MoKTtcclxuXHJcbiAgICAgICAgZS5idWZmZXJzWzBdLnNldChjZWxsKTtcclxuICAgICAgICBlLmJ1ZmZlcnNbMV0uc2V0KGNlbGwpO1xyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNpb25pYzsiLCJtb2R1bGUuZXhwb3J0cyA9IFtcclxuICAgIHtcclxuICAgICAgICByZTogLyNbQS1aMC05IEBdK3tbXn1dK30vZyxcclxuICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgIC8vU2lPTiBkcml2ZXIgY29tbWFuZHNcclxuICAgICAgICAgICAgLy8gbGlrZSAjT1BNIG9yICNFRkZFQ1QwXHJcbiAgICAgICAgICAgIC8vRG8gbm90aGluZ1xyXG4gICAgICAgICAgICByZXR1cm4geyBuYW1lOiBcInNpb24gY29tbWFuZHNcIiB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXSIsIm1vZHVsZS5leHBvcnRzID0gW1xyXG4gICAge1xyXG4gICAgICAgIHJlOiAvXFwvXFwqW15cXCpdKlxcKlxcLy9nLFxyXG4gICAgICAgIGZ1bmM6IGZ1bmN0aW9uKG0pIHtcclxuICAgICAgICAgICAgLy9DIHN0eWxlIENvbW1lbnRzXHJcbiAgICAgICAgICAgIC8vRG8gbm90aGluZ1xyXG4gICAgICAgICAgICByZXR1cm4geyBuYW1lOiBcImNvbW1lbnRzXCIgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICAgIHJlOiAva3RcXC0oXFxkKikvZyxcclxuICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IFwia3RcIiwgdmFsOiAtIHRvSW50KG1bMV0pIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgICByZTogL1xcI1dBVkIoXFxkKylcXHsoWzAtOUEtRmEtZl17NjR9KVxcfS9nLFxyXG4gICAgICAgIGZ1bmM6IGZ1bmN0aW9uKG0pIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogXCIjV0FWQlwiLCB2YWw6IFttWzFdLCBtWzJdLm1hdGNoKC8uezJ9L2cpLm1hcChoZXhUb0ludDgpXSB9O1xyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gaGV4VG9JbnQ4KHgpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gSW50OEFycmF5LmZyb20oW3BhcnNlSW50KHgsMTYpXSlbMF07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuXSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obW1sKXtcclxuICAgIC8v5pyA5Yid44Gr6KaL44Gk44GL44Gj44Gf44OG44Oz44Od6KGo6KiY44KS5YWo44OI44Op44OD44Kv44Gr6YGp55So44GZ44KLXHJcbiAgICB2YXIgZm91bmQgPSBtbWwubWF0Y2goL15rdChbMC05XSspLyk7XHJcbiAgICBcclxuICAgIGlmKGZvdW5kICYmIGZvdW5kWzFdKXtcclxuICAgICAgICBtbWwgPSBcIlwiK21tbC5zcGxpdChcIjtcIikubWFwKGZ1bmN0aW9uKHRyYWNrKXtcclxuICAgICAgICAgICAgcmV0dXJuIFwidFwiICsgZm91bmRbMV0gKyB0cmFjaztcclxuICAgICAgICB9KS5qb2luKFwiO1wiKTtcclxuICAgIH1cclxuICAgIHJldHVybiBtbWw7XHJcbn0iXX0=
