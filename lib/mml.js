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

    function hexToInt8(x) {
      return Int8Array.from([parseInt(x,16)])[0];
    }

    var MMLCommands = [
        {
            re: /\#FM2OP@(\d+,\d+,\d+,\d+,\d+)/g,
            func: function(m) {
                return { name: "#FM2OP@", val: m[1].split(",").map(toInt) };
            }
        },
        {
            re: /\#WAVB(\d+),([0-9A-F]{64})/g,
            func: function(m) {
                return { name: "#WAVB", val: [m[1], m[2].match(/.{2}/g).map(hexToInt8)] };
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
            re: /kt\-(\d*)/g,
            func: function(m) {
                return { name: "kt", val: - toInt(m[1]) };
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
    
    var SionAdapter = require("./sion-adapter");
    var MMLCommands = SionAdapter.concat(MMLCommands);

    var sequencer = new MMLSequencer(mmldata);

    return function(e) {
        var cell = sequencer.process();

        e.buffers[0].set(cell);
        e.buffers[1].set(cell);
    }
}

module.exports = Sionic;