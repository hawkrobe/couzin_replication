
import os
import shutil
import datetime

time = datetime.datetime.now().strftime('%Y-%m-%d-%H-%M-%S')

shutil.move('./data/', '../datapile/' + time + '-data')

for subset in ['exploratory','confirmatory']:
    os.makedirs('./data/' + subset + '/games/')
    os.makedirs('./data/' + subset + '/latencies/')

os.system('git add --all ../')
os.system('git commit -m "Running ' + time + '"')

os.system('git rev-parse HEAD >> ./data/commit_num')

os.system('node app.js >> ./data/log  2>&1')
