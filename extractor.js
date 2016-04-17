var fs = require('fs');
var request = require('request'), iconv  = require('iconv-lite');
var cheerio = require('cheerio');
var SnowBall = require('jsnowball');
var natural = require('natural');
var uwords = require('uwords');

// Import CSV
var csv = require("fast-csv");

// Create a Limdu Model
function newClassifierFunction() {
		var limdu = require('limdu');

		var TextClassifier = limdu.classifiers.multilabel.BinaryRelevance.bind(0, {
			binaryClassifierType: limdu.classifiers.SvmJs.bind(0, {C: 1.0})
		});

		// Initialize a classifier with a feature extractor and a lookup table:
		return new limdu.classifiers.EnhancedClassifier({
			classifierType: TextClassifier,
			featureExtractor: limdu.features.NGramsOfWords(1),
			featureLookupTable: new limdu.features.FeatureLookupTable(),
			pastTrainingSamples: []
		});
}

var arrayUnique = function(a) {
	return a.reduce(function(p, c) {
			if (p.indexOf(c) < 0) p.push(c);
			return p;
	}, []);
};

function removeNewlines(str) {
	//remove line breaks from str
	str = str.replace(/\s{2,}/g, ' : ');
	str = str.replace(/\t/g, ' : ');
	str = str.toString().trim().replace(/(\r\n|\n|\r)/g," : ");
	return str;
}

function removeArray ( arr, text ) {
	text = String(text);
	arr.forEach( function ( element, index ) {
		text = text.replace(new RegExp(element, "g"), "");
	} );

	return text;
}

// Limdu
var serialize = require('serialization');
//var intentClassifier = serialize.fromString(fs.readFileSync("data/model.data", 'utf8'), __dirname);

var intentClassifier = newClassifierFunction();

// Extractor
var extractor = require('unfluff');

var startIndex = 0;
var doneIndex = 0;
var end = false;

csv
.fromPath("data/import/MatchPreviews.csv")
.on("data", function(data){
	if ( data[0].indexOf("http") < 0 ) {
		return;
	}

	startIndex++;

	parse(data[0], data[1], "da", function () {
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
});

// Parse URL
function parse ( url, category, language, callback ) {
	request(url, function (error, response, body) {
		var body = iconv.decode(new Buffer(body), "ISO-8859-1");
		if ( ! error && ( response.statusCode == 200 || response.statusCode == 300 ) ) {
			$ = cheerio.load(body);

			var stopwords = fs.readFileSync("data/stopwords/" + language + ".txt", 'utf8').split("\n");
			
			var data = extractor(body, language);

			stopwords.forEach(function ( word, index ) {
				word = word.trim();

				data.text = data.text.replace(new RegExp('\\b' + word + '\\b', "gi"), '');
			});

			data.text = data.text.replace(/\n\r/g, " ").replace(/\n/g, ". ").replace(".", " ").replace(/\s{2,}/g, ' ').trim();

			var snowBall = new SnowBall('danish');
			removeEntities( data.text, language, function ( text ) {
				text = text.toLowerCase();
				snowBall.stem(text, function( error,response ) {
					if ( ! error ) {
						text = response.join(" ");
						
						var words = uwords(text);

						var wordsCount = new Map([...new Set(words)].map(
							x => [x, words.filter(y => y === x).length]
						));

						var words = [];

						wordsCount.forEach( function ( y, x ) {
							if ( y > 1 ) {
								words.push(x);
							}
						} );

						text = words.join(" ");
						console.log(intentClassifier.classify(text));

						//intentClassifier.trainOnline(text, category);
						intentClassifier.trainBatch([
							{input: text, output: category}
						]);
						//intentClassifier.retrain();
						callback();
					}
				});
			} );
		} else {
			console.log(error);
			// Error
		}
	});
}

function removeEntities ( text, language, callback ) {
	var settings = JSON.parse(require('fs').readFileSync(`data/ner/${language}.json`, 'utf8'));

	text = removeArray(settings.replaces, removeNewlines(text));

	request.post({
		headers: {'content-type' : 'application/json'},
		url:     'http://127.0.0.1:3000/',
		method: 'POST',
		encoding: 'utf8',
		json: {"text": text}
	}, function( error, response, body ){
		if ( error || body == undefined ) {
			return false;
		}

		var entities = [];
		var items = [];

		if ( body["MISC"] != undefined ) {
			items = items.concat(body["MISC"]);
		}

		if ( body["PERSON"] != undefined ) {
			items = items.concat( body["PERSON"]);
		}

		if ( body["LOCATION"] != undefined ) {
			items = items.concat(body["LOCATION"]);
		}

		if ( body["ORGANIZATION"] != undefined ) {
			items = items.concat(body["ORGANIZATION"]);
		}

		entities = arrayUnique(items);

		entities.forEach( function ( element, index ) {
			if ( settings.blacklist.indexOf(element) >= 0 ) {
				entities.splice(index, 1);
			}

			settings.split_list.forEach( function ( el ) {
				var s = element.split(el);
				if ( s[0] != element ) {
					entities.splice(index, 1);

					entities = entities.concat(s);
				}
			} );
		} );

		entities.forEach(function ( entity, index ) {
			if ( index != null && index != undefined && entity != undefined ) {
				text = text.replace(new RegExp('\\b' + entity + '\\b', "gi"), ' ');
			}
		});

		text = text.replace(/-/g, "").replace(/\./g, " ").replace(/,/g, " ");

		callback(text);
	});
}

//parse("http://www.bold.dk/fodbold/nyheder/ac-horsens-henter-peter-nymann/", "", "da");