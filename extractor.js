var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');

// Import CSV
var csv = require("fast-csv");

// Create a Limdu Model
function newClassifierFunction() {
		var limdu = require('limdu');

		// First, define our base classifier type (a multi-label classifier based on svm.js):
		var TextClassifier = limdu.classifiers.multilabel.BinaryRelevance.bind(0, {
		    binaryClassifierType: limdu.classifiers.Winnow.bind(0, {retrain_count: 10})
		});

		// Initialize a classifier with a feature extractor and a lookup table:
		return new limdu.classifiers.EnhancedClassifier({
		    classifierType: TextClassifier,
		    featureExtractor: limdu.features.NGramsOfWords(1),  // each word ("1-gram") is a feature
		    featureLookupTable: new limdu.features.FeatureLookupTable(),
		    pastTrainingSamples: []
		});
}

// Limdu
var serialize = require('serialization');
//var intentClassifier = serialize.fromString(fs.readFileSync("data/model.data", 'utf8'), __dirname);

//var intentClassifier = newClassifierFunction();

// Extractor
var extractor = require('unfluff');

var startIndex = 0;
var doneIndex = 0;
var end = false;

/*csv
.fromPath("data/import/MatchReports.csv")
.on("data", function(data){
	if ( data[0].indexOf("http") < 0 ) {
		return;
	}

	startIndex++;

	parse(data[0], data[1], function () {
		doneIndex++;

		if ( startIndex == doneIndex && end == true ) {
			console.log(startIndex, doneIndex);
			fs.writeFile( "data/model.data", serialize.toString(intentClassifier, newClassifierFunction), "utf8" );
		}
	});
})
.on("end", function(){
	end = true;
}).on("error", function () {
	console.log("Error");
});*/

// Parse URL
function parse ( url, category, language, callback ) {
	request(url, function (error, response, body) {
		if ( ! error && ( response.statusCode == 200 || response.statusCode == 300 ) ) {
			$ = cheerio.load(body);

			var stopwords = fs.readFileSync("data/stopwords/" + language + ".txt", 'utf8').split("\n");
			
			var data = extractor(body, language);

			stopwords.forEach(function ( word, index ) {
				word = word.trim();

				data.text = data.text.replace(new RegExp('\\b' + word + '\\b', "gi"), '').replace("  ", " ");
			});

			console.log(data.text);

			//console.log(intentClassifier.classify(data.text));

			//intentClassifier.trainOnline(data.text, category);
				
			//fs.writeFile( "data/model.data", serialize.toString(intentClassifier, newClassifierFunction), "utf8" );
			//callback();

		} else {
			console.log(error);
			// Error
		}
	});
}

parse("http://www.bold.dk/fodbold/nyheder/broendby-henter-profil-i-lyngby/", "Soccer/Transfers", "da");