module.exports = function(mml){
    //最初に見つかったテンポ表記を全トラックに適用する
    var found = mml.match(/t([0-9]+)/);
    mml = ""+mml.split(";").map(function(track){
        return "t" + found[1] + track;
    }).join(";");
    return mml;
}