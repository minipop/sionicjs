(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Sionic = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
            this.tie = false;
            this.curFreq = 0;
            this.index = -1;
            this.samples = 0;
            this.loopStack = [];
            this.commands = this.compile(mml);
            this.toneGenerator = new PwmGenerator();
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
                case "@":
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

                    var freq = (cmd.name === "rest") ? 0 : midicps(cmd.tone + this.octave * 12);

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
},{"./sion-adapter":3,"./sion-preprocess":4}],3:[function(require,module,exports){
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
module.exports = function(mml){
    //最初に見つかったテンポ表記を全トラックに適用する
    var found = mml.match(/t([0-9]+)/);
    mml = ""+mml.split(";").map(function(track){
        return "t" + found[1] + track;
    }).join(";");
    return mml;
}
},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9tbWwuanMiLCJsaWIvc2lvbi1hZGFwdGVyLmpzIiwibGliL3Npb24tcHJlcHJvY2Vzcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdm1CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9saWIvbW1sXCIpO1xyXG4iLCIvLyBPcmlnaW5hbCBzb3VyY2UgYXJlIHdyaXR0ZW4gYnkgbW9oYXlvbmFvIFxyXG4vLyBodHRwczovL2dpdGh1Yi5jb20vbW9oYXlvbmFvL3BpY28uanMvYmxvYi9tYXN0ZXIvZXhhbXBsZXMvZGVtby5qc1xyXG5cclxuLy8gTW9kaWZ5IGJ5IG1pbmlwb3AsIHRvIHVzZSBhcyBhIGxpYnJhcnkuXHJcbi8vIE1JVCBsaWNlbnNlLiBzZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9tb2hheW9uYW8vcGljby5qc1xyXG5cclxuZnVuY3Rpb24gU2lvbmljKG1tbGRhdGEpIHtcclxuICAgIFwidXNlIHN0cmljdFwiO1xyXG5cclxuICAgIGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xyXG4gICAgICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XHJcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBjdG9yIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByZXBlYXQobiwgY2gpIHtcclxuICAgICAgICB2YXIgc3RyID0gXCJcIjtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzdHIgKz0gY2g7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBzdHI7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbWlkaWNwcyhtaWRpKSB7XHJcbiAgICAgICAgcmV0dXJuIDQ0MCAqIE1hdGgucG93KDIsIChtaWRpIC0gNjkpIC8gMTIpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBUb25lR2VuZXJhdG9yID0gKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIFRvbmVHZW5lcmF0b3IoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2FtcGxlUmF0ZSA9IFBpY28uc2FtcGxlUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy52ZWxvY2l0eSA9IDAuODtcclxuICAgICAgICAgICAgdGhpcy5jZWxsID0gbmV3IEZsb2F0MzJBcnJheShQaWNvLmJ1ZmZlclNpemUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgVG9uZUdlbmVyYXRvci5wcm90b3R5cGUuc2V0VmVsb2NpdHkgPSBmdW5jdGlvbih2YWwpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudmVsb2NpdHkgPSB2YWwgLyAxNjtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBUb25lR2VuZXJhdG9yLnByb3RvdHlwZS5zZXRQYXJhbXMgPSBmdW5jdGlvbih2YWwpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZW52KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmVudi5zZXRQYXJhbXModmFsKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiBUb25lR2VuZXJhdG9yO1xyXG4gICAgfSkoKTtcclxuXHJcbiAgICB2YXIgRk1TeW50aEJhc3MgPSAoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgZnVuY3Rpb24gRk1TeW50aEJhc3MoKSB7XHJcbiAgICAgICAgICAgIFRvbmVHZW5lcmF0b3IuY2FsbCh0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5vcCA9IFtcclxuICAgICAgICAgICAgICAgIHsgcGhhc2U6IDAsIHBoYXNlSW5jcjogMCwgYW1wOiAxIH0sXHJcbiAgICAgICAgICAgICAgICB7IHBoYXNlOiAwLCBwaGFzZUluY3I6IDAsIGFtcDogMSB9LFxyXG4gICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICB0aGlzLmZiID0gMDtcclxuICAgICAgICAgICAgdGhpcy5mYmx2ID0gMC4wOTc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGluaGVyaXRzKEZNU3ludGhCYXNzLCBUb25lR2VuZXJhdG9yKTtcclxuXHJcbiAgICAgICAgRk1TeW50aEJhc3MucHJvdG90eXBlLnNldEZyZXEgPSBmdW5jdGlvbih2YWwpIHtcclxuICAgICAgICAgICAgdGhpcy5vcFswXS5waGFzZUluY3IgPSB2YWwgLyB0aGlzLnNhbXBsZVJhdGUgKiAwLjU7XHJcbiAgICAgICAgICAgIHRoaXMub3BbMV0ucGhhc2VJbmNyID0gdmFsIC8gdGhpcy5zYW1wbGVSYXRlO1xyXG4gICAgICAgICAgICB0aGlzLm9wWzBdLmFtcCA9IDAuNzU7XHJcbiAgICAgICAgICAgIHRoaXMub3BbMV0uYW1wID0gMTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBGTVN5bnRoQmFzcy5wcm90b3R5cGUucHJvY2VzcyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgb3AgPSB0aGlzLm9wO1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGltYXggPSB0aGlzLmNlbGwubGVuZ3RoOyBpIDwgaW1heDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcGhhc2UwID0gb3BbMF0ucGhhc2UgKyB0aGlzLmZiICogdGhpcy5mYmx2O1xyXG4gICAgICAgICAgICAgICAgdmFyIHgwID0gTWF0aC5zaW4ocGhhc2UwICogMiAqIE1hdGguUEkpICogb3BbMF0uYW1wO1xyXG4gICAgICAgICAgICAgICAgdmFyIHBoYXNlMSA9IG9wWzFdLnBoYXNlICsgeDA7XHJcbiAgICAgICAgICAgICAgICB2YXIgeDEgPSBNYXRoLnNpbihwaGFzZTEgKiAyICogTWF0aC5QSSkgKiBvcFsxXS5hbXA7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNlbGxbaV0gPSB4MSAqIHRoaXMudmVsb2NpdHkgKiAwLjE1O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5mYiA9IHgwO1xyXG4gICAgICAgICAgICAgICAgb3BbMF0ucGhhc2UgKz0gb3BbMF0ucGhhc2VJbmNyO1xyXG4gICAgICAgICAgICAgICAgb3BbMV0ucGhhc2UgKz0gb3BbMV0ucGhhc2VJbmNyO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBvcFswXS5hbXAgKj0gMC45OTU7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jZWxsO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiBGTVN5bnRoQmFzcztcclxuICAgIH0pKCk7XHJcblxyXG4gICAgdmFyIEZNU3ludGhMZWFkID0gKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIEZNU3ludGhMZWFkKCkge1xyXG4gICAgICAgICAgICBUb25lR2VuZXJhdG9yLmNhbGwodGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMub3AgPSBbXHJcbiAgICAgICAgICAgICAgICB7IHBoYXNlOiAwLCBwaGFzZUluY3I6IDAsIGFtcDogMSB9LFxyXG4gICAgICAgICAgICAgICAgeyBwaGFzZTogMCwgcGhhc2VJbmNyOiAwLCBhbXA6IDEgfSxcclxuICAgICAgICAgICAgICAgIHsgcGhhc2U6IDAsIHBoYXNlSW5jcjogMCwgYW1wOiAxIH0sXHJcbiAgICAgICAgICAgICAgICB7IHBoYXNlOiAwLCBwaGFzZUluY3I6IDAsIGFtcDogMSB9LFxyXG4gICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICB0aGlzLmZiID0gMDtcclxuICAgICAgICAgICAgdGhpcy5mYmx2ID0gMC4zO1xyXG4gICAgICAgICAgICB0aGlzLmVudiA9IG5ldyBFbnZlbG9wZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpbmhlcml0cyhGTVN5bnRoTGVhZCwgVG9uZUdlbmVyYXRvcik7XHJcblxyXG4gICAgICAgIEZNU3ludGhMZWFkLnByb3RvdHlwZS5zZXRGcmVxID0gZnVuY3Rpb24odmFsKSB7XHJcbiAgICAgICAgICAgIHRoaXMub3BbMF0ucGhhc2VJbmNyID0gdmFsIC8gdGhpcy5zYW1wbGVSYXRlICogMjtcclxuICAgICAgICAgICAgdGhpcy5vcFsxXS5waGFzZUluY3IgPSB2YWwgLyB0aGlzLnNhbXBsZVJhdGUgKiAxO1xyXG4gICAgICAgICAgICB0aGlzLm9wWzJdLnBoYXNlSW5jciA9IHZhbCAvIHRoaXMuc2FtcGxlUmF0ZSAqIDQ7XHJcbiAgICAgICAgICAgIHRoaXMub3BbM10ucGhhc2VJbmNyID0gdmFsIC8gdGhpcy5zYW1wbGVSYXRlICogMS4wMDU7XHJcbiAgICAgICAgICAgIHRoaXMub3BbMF0uYW1wID0gMC41O1xyXG4gICAgICAgICAgICB0aGlzLm9wWzFdLmFtcCA9IDI7XHJcbiAgICAgICAgICAgIHRoaXMub3BbMl0uYW1wID0gNDtcclxuICAgICAgICAgICAgdGhpcy5vcFszXS5hbXAgPSAwLjU7XHJcbiAgICAgICAgICAgIHRoaXMuZW52LmJhbmcoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBGTVN5bnRoTGVhZC5wcm90b3R5cGUucHJvY2VzcyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgb3AgPSB0aGlzLm9wO1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGltYXggPSB0aGlzLmNlbGwubGVuZ3RoOyBpIDwgaW1heDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcGhhc2UwID0gb3BbMF0ucGhhc2UgKyB0aGlzLmZiICogdGhpcy5mYmx2O1xyXG4gICAgICAgICAgICAgICAgdmFyIHgwID0gTWF0aC5zaW4ocGhhc2UwICogMiAqIE1hdGguUEkpICogb3BbMF0uYW1wO1xyXG4gICAgICAgICAgICAgICAgdmFyIHBoYXNlMSA9IG9wWzFdLnBoYXNlICsgeDA7XHJcbiAgICAgICAgICAgICAgICB2YXIgeDEgPSBNYXRoLnNpbihwaGFzZTEgKiAyICogTWF0aC5QSSkgKiBvcFsxXS5hbXA7XHJcbiAgICAgICAgICAgICAgICB2YXIgcGhhc2UyID0gb3BbMl0ucGhhc2U7XHJcbiAgICAgICAgICAgICAgICB2YXIgeDIgPSBNYXRoLnNpbihwaGFzZTIgKiAyICogTWF0aC5QSSkgKiBvcFsyXS5hbXA7XHJcbiAgICAgICAgICAgICAgICB2YXIgcGhhc2UzID0gb3BbM10ucGhhc2UgKyB4MjtcclxuICAgICAgICAgICAgICAgIHZhciB4MyA9IE1hdGguc2luKHBoYXNlMyAqIDIgKiBNYXRoLlBJKSAqIG9wWzNdLmFtcDtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2VsbFtpXSA9ICh4MSArIHgzKSAqIHRoaXMudmVsb2NpdHkgKiAwLjE7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZiID0geDA7XHJcbiAgICAgICAgICAgICAgICBvcFswXS5waGFzZSArPSBvcFswXS5waGFzZUluY3I7XHJcbiAgICAgICAgICAgICAgICBvcFsxXS5waGFzZSArPSBvcFsxXS5waGFzZUluY3I7XHJcbiAgICAgICAgICAgICAgICBvcFsyXS5waGFzZSArPSBvcFsyXS5waGFzZUluY3I7XHJcbiAgICAgICAgICAgICAgICBvcFszXS5waGFzZSArPSBvcFszXS5waGFzZUluY3I7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIG9wWzBdLmFtcCAqPSAwLjk5ODg7XHJcbiAgICAgICAgICAgIG9wWzJdLmFtcCAqPSAwLjk5OTg7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmVudi5wcm9jZXNzKHRoaXMuY2VsbCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNlbGw7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuIEZNU3ludGhMZWFkO1xyXG4gICAgfSkoKTtcclxuXHJcbiAgICB2YXIgUHdtR2VuZXJhdG9yID0gKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIFB3bUdlbmVyYXRvcigpIHtcclxuICAgICAgICAgICAgVG9uZUdlbmVyYXRvci5jYWxsKHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLmVudiA9IG5ldyBFbnZlbG9wZSgpO1xyXG4gICAgICAgICAgICB0aGlzLnBoYXNlID0gMDtcclxuICAgICAgICAgICAgdGhpcy5waGFzZUluY3IgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLndpZHRoID0gMC41O1xyXG4gICAgICAgIH1cclxuICAgICAgICBpbmhlcml0cyhQd21HZW5lcmF0b3IsIFRvbmVHZW5lcmF0b3IpO1xyXG5cclxuICAgICAgICBQd21HZW5lcmF0b3IucHJvdG90eXBlLnNldEZyZXEgPSBmdW5jdGlvbih2YWwpIHtcclxuICAgICAgICAgICAgdGhpcy5waGFzZUluY3IgPSB2YWwgLyB0aGlzLnNhbXBsZVJhdGU7XHJcbiAgICAgICAgICAgIHRoaXMuZW52LmJhbmcoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBQd21HZW5lcmF0b3IucHJvdG90eXBlLnNldFdpZHRoID0gZnVuY3Rpb24odmFsKSB7XHJcbiAgICAgICAgICAgIHRoaXMud2lkdGggPSB2YWwgKiAwLjAxO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIFB3bUdlbmVyYXRvci5wcm90b3R5cGUucHJvY2VzcyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaW1heCA9IHRoaXMuY2VsbC5sZW5ndGg7IGkgPCBpbWF4OyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2VsbFtpXSA9ICh0aGlzLnBoYXNlIDwgdGhpcy53aWR0aCA/ICswLjEgOiAtMC4xKSAqIHRoaXMudmVsb2NpdHk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBoYXNlICs9IHRoaXMucGhhc2VJbmNyO1xyXG4gICAgICAgICAgICAgICAgd2hpbGUgKHRoaXMucGhhc2UgPj0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGhhc2UgLT0gMTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5lbnYucHJvY2Vzcyh0aGlzLmNlbGwpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2VsbDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gUHdtR2VuZXJhdG9yO1xyXG4gICAgfSkoKTtcclxuXHJcbiAgICB2YXIgTm9pc2VHZW5lcmF0b3IgPSAoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgZnVuY3Rpb24gTm9pc2VHZW5lcmF0b3IoKSB7XHJcbiAgICAgICAgICAgIFRvbmVHZW5lcmF0b3IuY2FsbCh0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5lbnYgPSBuZXcgRW52ZWxvcGUoKTtcclxuICAgICAgICAgICAgdGhpcy5waGFzZSA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMucGhhc2VJbmNyID0gMTtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMub25PZmYgPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpbmhlcml0cyhOb2lzZUdlbmVyYXRvciwgVG9uZUdlbmVyYXRvcik7XHJcblxyXG4gICAgICAgIE5vaXNlR2VuZXJhdG9yLnByb3RvdHlwZS5zZXRGcmVxID0gZnVuY3Rpb24odmFsKSB7XHJcbiAgICAgICAgICAgIHRoaXMub25PZmYgPSB2YWwgPyAwLjE1IDogMDtcclxuICAgICAgICAgICAgdGhpcy5lbnYuYmFuZygpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIE5vaXNlR2VuZXJhdG9yLnByb3RvdHlwZS5zZXROb2lzZSA9IGZ1bmN0aW9uKHZhbCkge1xyXG4gICAgICAgICAgICBpZiAodmFsID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5waGFzZUluY3IgPSA0IC8gdmFsO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5waGFzZUluY3IgPSAwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgTm9pc2VHZW5lcmF0b3IucHJvdG90eXBlLnByb2Nlc3MgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGltYXggPSB0aGlzLmNlbGwubGVuZ3RoOyBpIDwgaW1heDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNlbGxbaV0gPSB0aGlzLnZhbHVlICogdGhpcy5vbk9mZjtcclxuICAgICAgICAgICAgICAgIHRoaXMucGhhc2UgKz0gdGhpcy5waGFzZUluY3I7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5waGFzZSA+PSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5waGFzZSAtPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmFsdWUgPSBNYXRoLnJhbmRvbSgpICogdGhpcy52ZWxvY2l0eTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5lbnYucHJvY2Vzcyh0aGlzLmNlbGwpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2VsbDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gTm9pc2VHZW5lcmF0b3I7XHJcbiAgICB9KSgpO1xyXG5cclxuICAgIHZhciBFbnZlbG9wZSA9IChmdW5jdGlvbigpIHtcclxuICAgICAgICBmdW5jdGlvbiBFbnZlbG9wZSgpIHtcclxuICAgICAgICAgICAgdGhpcy5zYW1wbGVSYXRlID0gUGljby5zYW1wbGVSYXRlO1xyXG4gICAgICAgICAgICB0aGlzLmEgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLmQgPSA2NDtcclxuICAgICAgICAgICAgdGhpcy5zID0gMzI7XHJcbiAgICAgICAgICAgIHRoaXMuciA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMuc2FtcGxlcyA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdHVzID0gMDtcclxuICAgICAgICAgICAgdGhpcy54ID0gMTtcclxuICAgICAgICAgICAgdGhpcy5keCA9IDA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBFbnZlbG9wZS5wcm90b3R5cGUuc2V0UGFyYW1zID0gZnVuY3Rpb24ocGFyYW1zKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYSA9IHBhcmFtc1swXTtcclxuICAgICAgICAgICAgdGhpcy5kID0gcGFyYW1zWzFdO1xyXG4gICAgICAgICAgICB0aGlzLnMgPSBwYXJhbXNbMl07XHJcbiAgICAgICAgICAgIHRoaXMuciA9IHBhcmFtc1szXTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBFbnZlbG9wZS5wcm90b3R5cGUuYmFuZyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGlzLnNhbXBsZXMgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXR1cyA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMueCA9IDE7XHJcbiAgICAgICAgICAgIHRoaXMuZHggPSAwO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIEVudmVsb3BlLnByb3RvdHlwZS5wcm9jZXNzID0gZnVuY3Rpb24oY2VsbCkge1xyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5zYW1wbGVzIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAodGhpcy5zdGF0dXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdHVzID0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zYW1wbGVzID0gKHRoaXMuYSAqIDAuMDA1KSAqIHRoaXMuc2FtcGxlUmF0ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy54ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5keCA9ICgxIC8gdGhpcy5zYW1wbGVzKSAqIGNlbGwubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdHVzID0gMjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zYW1wbGVzID0gKHRoaXMuZCAqIDAuMDA1KSAqIHRoaXMuc2FtcGxlUmF0ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy54ID0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5keCA9IC0oMSAvIHRoaXMuc2FtcGxlcykgKiBjZWxsLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5keCAqPSAoMSAtIHRoaXMucyAvIDEyOCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0dXMgPSAzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNhbXBsZXMgPSBJbmZpbml0eTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5keCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnMgPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMueCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGltYXggPSBjZWxsLmxlbmd0aDsgaSA8IGltYXg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgY2VsbFtpXSAqPSB0aGlzLng7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMueCArPSB0aGlzLmR4O1xyXG4gICAgICAgICAgICB0aGlzLnNhbXBsZXMgLT0gY2VsbC5sZW5ndGg7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gY2VsbDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gRW52ZWxvcGU7XHJcbiAgICB9KSgpO1xyXG5cclxuICAgIHZhciBNTUxUcmFjayA9IChmdW5jdGlvbigpIHtcclxuICAgICAgICBmdW5jdGlvbiBNTUxUcmFjayhtbWwpIHtcclxuICAgICAgICAgICAgdGhpcy5zYW1wbGVSYXRlID0gUGljby5zYW1wbGVSYXRlO1xyXG4gICAgICAgICAgICB0aGlzLnRlbXBvID0gMTIwO1xyXG4gICAgICAgICAgICB0aGlzLmxlbiA9IDQ7XHJcbiAgICAgICAgICAgIHRoaXMub2N0YXZlID0gNTtcclxuICAgICAgICAgICAgdGhpcy50aWUgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5jdXJGcmVxID0gMDtcclxuICAgICAgICAgICAgdGhpcy5pbmRleCA9IC0xO1xyXG4gICAgICAgICAgICB0aGlzLnNhbXBsZXMgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLmxvb3BTdGFjayA9IFtdO1xyXG4gICAgICAgICAgICB0aGlzLmNvbW1hbmRzID0gdGhpcy5jb21waWxlKG1tbCk7XHJcbiAgICAgICAgICAgIHRoaXMudG9uZUdlbmVyYXRvciA9IG5ldyBQd21HZW5lcmF0b3IoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIE1NTFRyYWNrLnByb3RvdHlwZS5jb21waWxlID0gZnVuY3Rpb24obW1sKSB7XHJcbiAgICAgICAgICAgIHZhciBjbWQsIG0sIG1hc2s7XHJcbiAgICAgICAgICAgIHZhciBjb21tYW5kcyA9IFtdO1xyXG4gICAgICAgICAgICB2YXIgY2hlY2tlZCA9IHt9O1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGltYXggPSBNTUxDb21tYW5kcy5sZW5ndGg7IGkgPCBpbWF4OyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBkZWYgPSBNTUxDb21tYW5kc1tpXTtcclxuXHJcbiAgICAgICAgICAgICAgICB3aGlsZSAoKG0gPSBkZWYucmUuZXhlYyhtbWwpKSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghY2hlY2tlZFttLmluZGV4XSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja2VkW20uaW5kZXhdID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNtZCA9IGRlZi5mdW5jKG0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbWQuaW5kZXggPSBtLmluZGV4O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbWQub3JpZ2luID0gbVswXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzLnB1c2goY21kKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hc2sgPSByZXBlYXQobVswXS5sZW5ndGgsIFwiIFwiKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1tbCA9IG1tbC5zdWJzdHIoMCwgbS5pbmRleCkgKyBtYXNrICsgbW1sLnN1YnN0cihtLmluZGV4ICsgbWFzay5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29tbWFuZHMuc29ydChmdW5jdGlvbihhLCBiKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYS5pbmRleCAtIGIuaW5kZXg7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGNvbW1hbmRzO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIE1NTFRyYWNrLnByb3RvdHlwZS5kb0NvbW1hbmQgPSBmdW5jdGlvbihjbWQpIHtcclxuICAgICAgICAgICAgaWYgKCFjbWQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIHBlZWs7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKGNtZC5uYW1lKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiQFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoY21kLnZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRvbmVHZW5lcmF0b3IgPSBuZXcgUHdtR2VuZXJhdG9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b25lR2VuZXJhdG9yID0gbmV3IE5vaXNlR2VuZXJhdG9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA1OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b25lR2VuZXJhdG9yID0gbmV3IEZNU3ludGhCYXNzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA2OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b25lR2VuZXJhdG9yID0gbmV3IEZNU3ludGhMZWFkKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiQHdcIjpcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50b25lR2VuZXJhdG9yICYmIHRoaXMudG9uZUdlbmVyYXRvci5zZXRXaWR0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRvbmVHZW5lcmF0b3Iuc2V0V2lkdGgoY21kLnZhbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIkBuXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudG9uZUdlbmVyYXRvciAmJiB0aGlzLnRvbmVHZW5lcmF0b3Iuc2V0Tm9pc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b25lR2VuZXJhdG9yLnNldE5vaXNlKGNtZC52YWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJAZTFcIjpcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50b25lR2VuZXJhdG9yICYmIHRoaXMudG9uZUdlbmVyYXRvci5zZXRQYXJhbXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b25lR2VuZXJhdG9yLnNldFBhcmFtcyhjbWQudmFsKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwidFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGVtcG8gPSBjbWQudmFsO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcImxcIjpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxlbiA9IGNtZC52YWw7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwib1wiOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2N0YXZlID0gY21kLnZhbDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCI8XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vY3RhdmUgKz0gMTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCI+XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vY3RhdmUgLT0gMTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCImXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aWUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIi86XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb29wU3RhY2sucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OiB0aGlzLmluZGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogY21kLnZhbCB8fCAyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBleGl0OiAwXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiOi9cIjpcclxuICAgICAgICAgICAgICAgICAgICBwZWVrID0gdGhpcy5sb29wU3RhY2tbdGhpcy5sb29wU3RhY2subGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICAgICAgICAgICAgcGVlay5leGl0ID0gdGhpcy5pbmRleDtcclxuICAgICAgICAgICAgICAgICAgICBwZWVrLmNvdW50IC09IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlZWsuY291bnQgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvb3BTdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGV4ID0gcGVlay5pbmRleDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiL1wiOlxyXG4gICAgICAgICAgICAgICAgICAgIHBlZWsgPSB0aGlzLmxvb3BTdGFja1t0aGlzLmxvb3BTdGFjay5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocGVlay5jb3VudCA9PT0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvb3BTdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmRleCA9IHBlZWsuZXhpdDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwidlwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudG9uZUdlbmVyYXRvci5zZXRWZWxvY2l0eShjbWQudmFsKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJub3RlXCI6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwicmVzdFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBsZW4gPSBjbWQubGVuIHx8IHRoaXMubGVuO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2FtcGxlcyArPSAoKDYwIC8gdGhpcy50ZW1wbykgKiAoNCAvIGxlbikgKiB0aGlzLnNhbXBsZVJhdGUpIHwgMDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNhbXBsZXMgKj0gWzEsIDEuNSwgMS43NV1bY21kLmRvdF0gfHwgMTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZyZXEgPSAoY21kLm5hbWUgPT09IFwicmVzdFwiKSA/IDAgOiBtaWRpY3BzKGNtZC50b25lICsgdGhpcy5vY3RhdmUgKiAxMik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1ckZyZXEgIT09IGZyZXEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50aWUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy50aWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b25lR2VuZXJhdG9yLnNldEZyZXEoZnJlcSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VyRnJlcSA9IGZyZXE7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50aWUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgTU1MVHJhY2sucHJvdG90eXBlLnByb2Nlc3MgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMuc2FtcGxlcyA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmluZGV4ICs9IDE7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbmRleCA+PSB0aGlzLmNvbW1hbmRzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2FtcGxlcyA9IEluZmluaXR5O1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvQ29tbWFuZCh0aGlzLmNvbW1hbmRzW3RoaXMuaW5kZXhdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zYW1wbGVzIC09IFBpY28uYnVmZmVyU2l6ZTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnNhbXBsZXMgIT09IEluZmluaXR5ICYmIHRoaXMudG9uZUdlbmVyYXRvcikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9uZUdlbmVyYXRvci5wcm9jZXNzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gTU1MVHJhY2s7XHJcbiAgICB9KSgpO1xyXG5cclxuICAgIHZhciBNTUxTZXF1ZW5jZXIgPSAoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgZnVuY3Rpb24gTU1MU2VxdWVuY2VyKG1tbCkge1xyXG4gICAgICAgICAgICB2YXIgcHJlcHJvY2Vzc29yID0gcmVxdWlyZShcIi4vc2lvbi1wcmVwcm9jZXNzXCIpO1xyXG4gICAgICAgICAgICBtbWwgPSBwcmVwcm9jZXNzb3IobW1sKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRoaXMudHJhY2tzID0gbW1sLnNwbGl0KFwiO1wiKS5maWx0ZXIoZnVuY3Rpb24obW1sKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbW1sO1xyXG4gICAgICAgICAgICB9KS5tYXAoZnVuY3Rpb24obW1sKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE1NTFRyYWNrKG1tbCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLmNlbGwgPSBuZXcgRmxvYXQzMkFycmF5KFBpY28uYnVmZmVyU2l6ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBNTUxTZXF1ZW5jZXIucHJvdG90eXBlLnByb2Nlc3MgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdGhpcy5jZWxsLnNldChuZXcgRmxvYXQzMkFycmF5KHRoaXMuY2VsbC5sZW5ndGgpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMudHJhY2tzLmZvckVhY2goZnVuY3Rpb24odHJhY2spIHtcclxuICAgICAgICAgICAgICAgIHZhciBjZWxsID0gdHJhY2sucHJvY2VzcygpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNlbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaW1heCA9IHRoaXMuY2VsbC5sZW5ndGg7IGkgPCBpbWF4OyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jZWxsW2ldICs9IGNlbGxbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCB0aGlzKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNlbGw7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuIE1NTFNlcXVlbmNlcjtcclxuICAgIH0pKCk7XHJcblxyXG4gICAgZnVuY3Rpb24gdG9JbnQoeCkge1xyXG4gICAgICAgIHJldHVybiB4IHwgMDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgTU1MQ29tbWFuZHMgPSBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZTogL0BlMSwoXFxkKyxcXGQrLFxcZCssXFxkKykvZyxcclxuICAgICAgICAgICAgZnVuYzogZnVuY3Rpb24obSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogXCJAZTFcIiwgdmFsOiBtWzFdLnNwbGl0KFwiLFwiKS5tYXAodG9JbnQpIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmU6IC9AdyhcXGQqKS9nLFxyXG4gICAgICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBcIkB3XCIsIHZhbDogdG9JbnQobVsxXSkgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZTogL0BuKFxcZCopL2csXHJcbiAgICAgICAgICAgIGZ1bmM6IGZ1bmN0aW9uKG0pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IFwiQG5cIiwgdmFsOiB0b0ludChtWzFdKSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJlOiAvQChcXGQqKS9nLFxyXG4gICAgICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBcIkBcIiwgdmFsOiB0b0ludChtWzFdKSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJlOiAvdChcXGQqKS9nLFxyXG4gICAgICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBcInRcIiwgdmFsOiB0b0ludChtWzFdKSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJlOiAvbChcXGQqKS9nLFxyXG4gICAgICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBcImxcIiwgdmFsOiB0b0ludChtWzFdKSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJlOiAvdihcXGQqKS9nLFxyXG4gICAgICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBcInZcIiwgdmFsOiB0b0ludChtWzFdKSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJlOiAvbyhcXGQqKS9nLFxyXG4gICAgICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBcIm9cIiwgdmFsOiB0b0ludChtWzFdKSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJlOiAvWzw+XS9nLFxyXG4gICAgICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBtWzBdIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmU6IC9cXC86KFxcZCopL2csXHJcbiAgICAgICAgICAgIGZ1bmM6IGZ1bmN0aW9uKG0pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IFwiLzpcIiwgdmFsOiB0b0ludChtWzFdKSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJlOiAvOlxcLy9nLFxyXG4gICAgICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBcIjovXCIgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZTogL1xcLy9nLFxyXG4gICAgICAgICAgICBmdW5jOiBmdW5jdGlvbihtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBcIi9cIiB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJlOiAvKFtjZGVmZ2FiXSkoWy0rXT8pKFxcZCopKFxcLiopL2csXHJcbiAgICAgICAgICAgIGZ1bmM6IGZ1bmN0aW9uKG0pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJub3RlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbm90ZTogbVsxXSxcclxuICAgICAgICAgICAgICAgICAgICBsZW46IHRvSW50KG1bM10pLFxyXG4gICAgICAgICAgICAgICAgICAgIGRvdDogbVs0XS5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgdG9uZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjOiAwLCBkOiAyLCBlOiA0LCBmOiA1LCBnOiA3LCBhOiA5LCBiOiAxMVxyXG4gICAgICAgICAgICAgICAgICAgIH1bbVsxXV0gKyB0b0ludCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiLVwiOiAtMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCIrXCI6ICsxXHJcbiAgICAgICAgICAgICAgICAgICAgfVttWzJdXSlcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmU6IC8oW3JdKShbLStdPykoXFxkKikoXFwuKikvZyxcclxuICAgICAgICAgICAgZnVuYzogZnVuY3Rpb24obSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogXCJyZXN0XCIsIG5vdGU6IG1bMV0sIGxlbjogdG9JbnQobVszXSksIGRvdDogbVs0XS5sZW5ndGggfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZTogLyYvZyxcclxuICAgICAgICAgICAgZnVuYzogZnVuY3Rpb24obSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogXCImXCIgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIF07XHJcbiAgICBcclxuICAgIHZhciBTaW9uQWRhcHRlciA9IHJlcXVpcmUoXCIuL3Npb24tYWRhcHRlclwiKTtcclxuICAgIHZhciBNTUxDb21tYW5kcyA9IFNpb25BZGFwdGVyLmNvbmNhdChNTUxDb21tYW5kcyk7XHJcblxyXG4gICAgdmFyIHNlcXVlbmNlciA9IG5ldyBNTUxTZXF1ZW5jZXIobW1sZGF0YSk7XHJcblxyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICB2YXIgY2VsbCA9IHNlcXVlbmNlci5wcm9jZXNzKCk7XHJcblxyXG4gICAgICAgIGUuYnVmZmVyc1swXS5zZXQoY2VsbCk7XHJcbiAgICAgICAgZS5idWZmZXJzWzFdLnNldChjZWxsKTtcclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTaW9uaWM7IiwibW9kdWxlLmV4cG9ydHMgPSBbXHJcbiAgICB7XHJcbiAgICAgICAgcmU6IC9cXC9cXCpbXlxcKl0qXFwqXFwvL2csXHJcbiAgICAgICAgZnVuYzogZnVuY3Rpb24obSkge1xyXG4gICAgICAgICAgICAvL0Mgc3R5bGUgQ29tbWVudHNcclxuICAgICAgICAgICAgLy9EbyBub3RoaW5nXHJcbiAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IFwiY29tbWVudHNcIiB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgcmU6IC8jW0EtWjAtOSBAXSt7W159XSt9L2csXHJcbiAgICAgICAgZnVuYzogZnVuY3Rpb24obSkge1xyXG4gICAgICAgICAgICAvL1NpT04gZHJpdmVyIGNvbW1hbmRzXHJcbiAgICAgICAgICAgIC8vIGxpa2UgI09QTSBvciAjRUZGRUNUMFxyXG4gICAgICAgICAgICAvL0RvIG5vdGhpbmdcclxuICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogXCJzaW9uIGNvbW1hbmRzXCIgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIFxyXG5dIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihtbWwpe1xyXG4gICAgLy/mnIDliJ3jgavopovjgaTjgYvjgaPjgZ/jg4bjg7Pjg53ooajoqJjjgpLlhajjg4jjg6njg4Pjgq/jgavpgannlKjjgZnjgotcclxuICAgIHZhciBmb3VuZCA9IG1tbC5tYXRjaCgvdChbMC05XSspLyk7XHJcbiAgICBtbWwgPSBcIlwiK21tbC5zcGxpdChcIjtcIikubWFwKGZ1bmN0aW9uKHRyYWNrKXtcclxuICAgICAgICByZXR1cm4gXCJ0XCIgKyBmb3VuZFsxXSArIHRyYWNrO1xyXG4gICAgfSkuam9pbihcIjtcIik7XHJcbiAgICByZXR1cm4gbW1sO1xyXG59Il19
