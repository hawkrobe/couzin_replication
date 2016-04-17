var babyparse = require("babyparse");
var fs = require("fs");

module.exports = {
  readCSV : function(filename){
    return babyparse
      .parse(fs.readFileSync(filename, 'utf8'),
	     {header : true})
      .data;
  },

  UUID: function() {
    var name = (Math.floor(Math.random() * 10) +
		'' + Math.floor(Math.random() * 10) +
		'' + Math.floor(Math.random() * 10) +
		'' + Math.floor(Math.random() * 10));
    var id = (name + '-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx')
	  .replace(/[xy]/g, function(c) {
	    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	    return v.toString(16);
	  });
    return id;
  },

  /**
   * Randomize array element order in-place.
   * Using Durstenfeld shuffle algorithm.
   */
  shuffle : function(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }
};
