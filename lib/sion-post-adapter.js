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