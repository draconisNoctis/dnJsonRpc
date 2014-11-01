
module.exports = function(grunt) {
	'use strict';

	var sm = require('source-map'),
		path = require('path');


	grunt.registerMultiTask('patch-sourcemap', function() {

		this.files.forEach(function(file) {
			file.src.forEach(function(file) {
				var consumer = new sm.SourceMapConsumer(grunt.file.read(file)),
					map = sm.SourceMapGenerator.fromSourceMap(consumer);

				consumer.sources.forEach(function(sourcefile) {
					map.setSourceContent(sourcefile, grunt.file.read(path.dirname(file) + '/' + sourcefile))
				});

				grunt.file.write(file, map.toString());
			});

		});
	});
}