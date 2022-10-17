# TileTogether Service

## Setup
1. Install Node.js and MongoDB
2. Make sure your Git CLI is authenticated with GitHub
3. Clone this repository
4. Run `npm install` in the root directory 
5. Make sure MongoDB is running on port 27017 
6. Run `npm run dev` in the root directory 
7. Go to `localhost:3001/health` to see if the server is running
8. Run `npm run test` to run the tests

## Workflow

Make sure you are checked out on the latest commit of the `main` branch
From that commit, create a new branch named after the feature you are working on, e.g. `setup-repo-ci-cd` by running
1. `git checkout -b setup-repo-ci-cd`
2. `git push -u origin setup-repo-ci-cd`
Make your commits to this branch until your feature is complete (remember to add tests)

You can edit a message located on any commit of your feature branch by running
1. `git rebase -i HEAD~<number of commits you want to edit>`
2. Change `pick` to `reword` or `r` for the commits you want to edit
3. Save and exit
4. An editor will open for each of the commits you want to edit, edit and save for each commit

Once you are ready to have your code reviewed, squash all the commits on your feature branch into one commit by running
1. `git rebase -i main`

Once you are ready to have your code reviewed, create a pull request on GitHub using the link
Before creating a pull request, combine all your commits into one and give it the same name as the branch, e.g. `setup-repo-ci-cd`, also remember to write a commit message/description
Create a pull request and assign one of the other team members to review your PR
On each revision of your pull request, give your revision the same name as the first commit and also add the revision number, e.g. `setup-repo-ci-cd (revision 1)` 
Once your PR is approved, `Squash and merge` your PR into the `main` branch from the GitHub website, give the squashed commmit the same name as the branch, e.g. `setup-repo-ci-cd`, the first line of the commit message/description should be a link to the approved PR, and then below that a short summary of all the changes made in the PR
Delete the branch you created for your feature
