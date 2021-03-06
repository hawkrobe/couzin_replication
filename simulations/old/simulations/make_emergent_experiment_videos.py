
from multiprocessing import Pool

import sys
import os
import shutil

sys.path.append('../scripts/')
from image_utils import *

import exp_config

reps = exp_config.plot_reps
info, in_dir = exp_config.get_emergent_config(reps)

tmp_out_dir = os.path.expanduser('~') + '/tmp-fish/'
final_out_dir = '../../../fish-movies-emergent/'
try:
    os.makedirs(final_out_dir)
except:
    pass

def func(exp_ind):
    
    experiment = info['experiments'][exp_ind]
    print experiment

    moves_file = in_dir + experiment  + '-simulation.csv'
    center_file = in_dir + experiment  + '-bg.csv'
    this_out_dir = tmp_out_dir + experiment  + '/'
    
    make_images(moves_file, this_out_dir + '/images/', center_file)
    
    os.system('sh ../scripts/to_video.sh ' + this_out_dir)
    
    shutil.move(this_out_dir + 'video.mp4', final_out_dir + experiment + '.mp4')

p = Pool(exp_config.num_procs)
p.map(func, range(len(info['experiments'])))
#map(func, range(len(info['experiments'])))

