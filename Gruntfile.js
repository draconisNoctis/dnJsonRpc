
module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt, { pattern: ['grunt-*', '!grunt-template-jasmine-istanbul'] });
	var pkg;

	grunt.initConfig({
		pkg: pkg = grunt.file.readJSON('package.json'),

		typescript: {
			src: {
				src: ['src/**/*.ts'],
				dest: 'dist',
				options: {
					comments: true,
					target: 'ES5',
					sourceMap: true,
					declaration: true,
					basePath: 'src'
				}
			}
		},

		watch: {
			ts: {
				files: ['src/**/*.ts'],
				tasks: ['typescript:src', 'patch-sourcemap']
			}
		},

		jasmine: {
			unit: {
				src: ['dist/**/*.js', '!dist/**/*.spec.js', '!dist/**/*.helper.js'],
				options: {
					specs: 'dist/**/*.spec.js',
					helpers: 'dist/**/*.helper.js',
					vendor: [
						"https://raw.githubusercontent.com/paulmillr/es6-shim/master/es6-shim.js",
						"bower_components/angular/angular.js",
						"bower_components/angular-mocks/angular-mocks.js"
					],
					keepRunner: true
				}
			},
			coverage: {
				src: ['dist/**/*.js', '!dist/**/*.spec.js', '!dist/**/*.helper.js'],
				options: {
					specs: 'dist/**/*.spec.js',
					helpers: 'dist/**/*.helper.js',
					vendor: [
						"https://raw.githubusercontent.com/paulmillr/es6-shim/master/es6-shim.js",
						"bower_components/angular/angular.js",
						"bower_components/angular-mocks/angular-mocks.js"
					],
					template: require('grunt-template-jasmine-istanbul'),
					templateOptions: {
						coverage: '.coverage/converage.json',
						report: '.coverage',
						files: ['**/*', '!**/app.js'],
						thresholds: {
							lines: 75,
							statements: 75,
							branches: 75,
							functions: 90
						}
					}
				}
			}
		},

		'patch-sourcemap': {
			src: {
				src: 'dist/**/*.js.map'
			}
		},


		clean: {
			dist: ['dist']
		},

		bower: {
			install: {
				options: {
					copy: false
				}
			}
		},

		tsd: {
			install: {
				options: {
					command: 'reinstall',
					config: 'tsd.json'
				}
			}
		},

		replace: {
			coverage: {
				options: {
					patterns: [{
						match: /(\/\* istanbul ignore next \*\/)?\(([_\w]+(?:\.[_\w]+)?\s*=\s*{})\)/gi,
						replacement: function($0, $1, $2) {
							if($1) {
								return  $0;
							}
							return '/* istanbul ignore next */(' + $2 + ')';
						}
					}]
				},
				files: [{expand: true, cwd: 'dist', src:['**/*.js'], dest: 'dist'}]
			}
		},

		todo: {
			options: {
				marks: [
					{
			          name: "FIX",
			          pattern: /@FIXME/i,
			          color: "red"
			        }, {
			          name: "TODO",
			          pattern: /@TODO/i,
			          color: "yellow"
			        }, {
			          name: "NOTE",
			          pattern: /@NOTE/i,
			          color: "blue"
			        }
		        ]
			},
			src: [
				'src/**'
			]
		}
	});
	
	grunt.loadTasks('tasks');

	grunt.registerTask('install', ['bower:install', 'tsd:install']);
	grunt.registerTask('build', ['clean', 'typescript', 'patch-sourcemap']);
	grunt.registerTask('tests', ['build', 'jasmine:unit']);
	grunt.registerTask('coverage', ['build', 'replace:coverage', 'jasmine:coverage']);
	grunt.registerTask('default', ['build', 'watch']);
}