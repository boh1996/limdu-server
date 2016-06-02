require('babel-register');

var fs = require('fs');
var serialize = require('serialization');
var intentClassifier = serialize.fromString(fs.readFileSync("data/model.data", 'utf8'), __dirname);
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