const express = require('express');
const { File } = require('./fileSchema.js');

export const FileRouter = express.Router();

FileRouter.post('/', getCommunityFiles);
FileRouter.get('/search/', search);
FileRouter.get('/user', getUserFiles);

async function getCommunityFiles(req, res) {

}

async function search(req, res) {

}

async function getUserFiles(req, res) {

}