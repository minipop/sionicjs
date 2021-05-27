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