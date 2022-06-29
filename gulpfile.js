'use strict';

const gulp = require('gulp'),
    babel = require('gulp-babel'),
    concat = require('gulp-concat'),
    cleancss = require('gulp-clean-css'),
    uglify = require('gulp-uglify-es').default,
    sass = require('gulp-sass')(require('node-sass')),
    clean = require('gulp-clean'),
    purgecss = require('gulp-purgecss'),
    rename = require('gulp-rename'),
    merge = require('merge-stream'),
    injectstring = require('gulp-inject-string'),
    inlinesource = require('gulp-inline-source'),
    bundleconfig = require('./bundleconfig.json'),
    zendeskconfig = require('./zendeskconfig.json'),
    fs = require('fs');

const editFilePartial = 'Edit this file at https://github.com/chocolatey/choco-theme/partials';
const { series, parallel, src, dest, watch } = require('gulp');

const regex = {
    css: /\.css$/,
    js: /\.js$/
};

const paths = {
    templates: 'templates/',
    globalpartials: 'global-partials/',
    assets: 'assets/',
    partials: 'global-partials',
    node_modules: 'node_modules/',
    theme: 'node_modules/choco-theme/'
};

const getBundles = (regexPattern) => {
    return bundleconfig.filter(bundle => {
        return regexPattern.test(bundle.outputFileName);
    });
};

const getZendeskBundles = (regexPattern) => {
    return zendeskconfig.filter(bundle => {
        return regexPattern.test(bundle.outputFileName);
    });
};

function del() {
    return src([
        paths.assets + 'css',
        paths.assets + 'js',
        paths.partials
    ], { allowEmpty: true })
        .pipe(clean({ force: true }));
}

function copyTheme() {
    var copyThemeToggleHbs = src(paths.theme + 'partials/ThemeToggle.txt')
        .pipe(injectstring.prepend('---\npartial: themetoggle\n---\n{{!-- ' + editFilePartial + ' --}}\n'))
        .pipe(rename({ basename: 'themetoggle', extname: '.hbs' }))
        .pipe(dest(paths.partials));

    return merge(copyThemeToggleHbs);
}

function compileSass() {
    return src(paths.theme + 'scss/zendesk.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(dest(paths.assets + 'css'));
}

function compileJs() {
    var tasks = getBundles(regex.js).map(function (bundle) {

        return src(bundle.inputFiles, { base: '.' })
            .pipe(babel({
                "sourceType": "unambiguous",
                "presets": [
                    ["@babel/preset-env", {
                        "targets": {
                            "ie": "10"
                        }
                    }
                  ]]
            }))
            .pipe(concat(bundle.outputFileName))
            .pipe(dest('.'));
    });

    return merge(tasks);
}

function compileCss() {
    var tasks = getBundles(regex.css).map(function (bundle) {

        return src(bundle.inputFiles, { base: '.' })
            .pipe(concat(bundle.outputFileName))
            .pipe(dest('.'));
    });

    return merge(tasks);
}

function purgeCss() {
    return src(paths.assets + 'css/chocolatey.bundle.css')
        .pipe(purgecss({
            content: [
                paths.templates + '*.hbs',
                paths.globalpartials + '*.hbs',
                paths.assets + 'js/*.*',
                paths.assets + 'js/*.*.*',
                paths.assets + 'js/*.*.*.*'
            ],
            safelist: ['::-webkit-scrollbar', '::-webkit-scrollbar-thumb', 'link-light', 'main', 'table-bordered', 'table-striped', 'table-responsive-sm', 'clear-button'],
            keyframes: true,
            variables: true
        }))
        .pipe(dest(paths.assets + 'css/'));
}

function minCss() {
    var tasks = getBundles(regex.css).map(function (bundle) {

        return src(bundle.outputFileName, { base: '.' })
            .pipe(cleancss({
                level: 2,
                compatibility: 'ie8'
            }))
            .pipe(rename({ suffix: '.min' }))
            .pipe(dest('.'));
    });

    return merge(tasks);
}

function minJs() {
    var tasks = getBundles(regex.js).map(function (bundle) {

        return src(bundle.outputFileName, { base: '.' })
            .pipe(uglify())
            .pipe(rename({ suffix: '.min' }))
            .pipe(dest('.'));
    });

    return merge(tasks);
}

function zendeskCss() {
    var tasks = getZendeskBundles(regex.css).map(function (bundle) {

        return src(bundle.inputFiles, { base: '.' })
            .pipe(concat(bundle.outputFileName))
            .pipe(dest('.'));
    });

    return merge(tasks);
}

// If the JS/CSS included in the inline assets below need to be updated, 
// replace the inline code with the tags specified above the function, and run `gulp`.

// document_head.hbs - <script type="text/javascript" src="../assets/js/chocolatey-head.bundle.min.js" inline></script>
// footer.hbs - <script type="text/javascript" src="../assets/js/chocolatey.bundle.min.js" inline></script>
function inlineAssets() {
    return src([paths.templates + 'footer.hbs', paths.templates + 'document_head.hbs'])
        .pipe(inlinesource())
        .pipe(dest(paths.templates));
}

function delEnd() {
    return src([
        paths.assets + 'css',
        paths.assets + 'js'
    ], { allowEmpty: true })
        .pipe(clean({ force: true }));
}

// Independednt tasks
exports.del = del;

// Gulp series
exports.compileSassJs = parallel(compileSass, compileJs);
exports.minCssJs = parallel(minCss, minJs);
exports.compileZendesk = parallel(zendeskCss, inlineAssets);

// Gulp default
exports.default = series(copyTheme, exports.compileSassJs, compileCss, purgeCss, exports.minCssJs, exports.compileZendesk, delEnd);

// Watch files
exports.watchFiles = function () {
    watch([paths.theme], exports.default);
};