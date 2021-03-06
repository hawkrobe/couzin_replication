
import os
import numpy as np
import itertools

DEBUG = True

if DEBUG:
    simulation_reps = 100
    noise_levels = [0]
else:
    simulation_reps = 25
    noise_levels = [0, 1/8.0 * 1/8.0, 1/8.0 * 1/4.0, 1/8.0 * 1/2.0, 1/8.0]

plot_reps = 2
num_players = 5

micro_dir = './output/predictions-micro/'
emergent_dir = './output/predictions-emergent/'
full_dir = './output/predictions-full-background/'

full_bg_dir = os.path.expanduser("~") + '/light-fields/'

strategies = ['asocial', 'naive_copy', 'move_to_center', 'smart']
#strategies = ['smart', 'naive', 'asocial', 'eager', 'lazy']

num_procs = 8

def get_emergent_config(reps):
    """
    Experiment 1 simulations
    """
    try:
        os.makedirs(emergent_dir)
    except:
        pass

    info = {}
    info['experiments'] = []
    info['background_types'] = []
    info['bots'] = []
    info['strategies'] = []
    for n_asocial in range(7) :
        for n_naive in range(7 - n_asocial) :
            for rep in range(reps):
                n_center = 0
                n_smart = 6 - n_asocial - n_naive
                composition = (n_asocial, n_naive, n_center, n_smart)
                bots = ([{'strategy' : 'asocial', 'prob_explore' : 0.5}] * n_asocial +
                        [{'strategy' : 'naive_copy', 'prob_explore' : 0.5}] * n_naive +
                        [{'strategy' : 'move_to_center', 'prob_explore' : 0.5}] * n_center +
                        [{'strategy' : 'smart', 'prob_explore' : 0.5}] * n_smart)
                nbots = len(bots)
                print(composition)
                info['experiments'] += ['-'.join(
                    [str(nbots), ''.join([str(i) for i in composition]), str(rep)]
                )]
                info['bots'] += [bots]
                info['strategies'] += [composition]

    for strategy in strategies :
        for group_size in range(1, 7) :
            for rep in range(reps):
                composition = np.array([strategy == 'asocial', strategy == 'naive_copy',
                                        strategy == 'move_to_center', strategy == 'smart']) * group_size
                bots = ([{'strategy' : 'asocial', 'prob_explore' : 0.5}] * composition[0] +
                        [{'strategy' : 'naive_copy', 'prob_explore' : 0.5}] * composition[1] +
                        [{'strategy' : 'move_to_center', 'prob_explore' : 0.5}] * composition[2] +
                        [{'strategy' : 'smart', 'prob_explore' : 0.5}] * composition[3])
                nbots = len(bots)
                print(composition)
                info['experiments'] += ['-'.join(
                    [str(nbots), ''.join([str(i) for i in composition]), str(rep)]
                )]
                info['bots'] += [bots]
                info['strategies'] += [composition]

    return info, emergent_dir

def get_full_background_config(reps):

    try:
        os.makedirs(full_dir)
    except:
        pass

    info = {}
    info['experiments'] = []
    info['nums_bots'] = []
    info['strategies'] = []
    info['noises'] = []
    for nbots in np.array(range(5)) + 1:
        for s in strategies:
            for bg_num in range(4):
                for noise in ['1en01','2en01']:
                    for rep in range(reps):
                        bg_name = str(bg_num) + '-' + noise
                        info['experiments'] += ['-'.join([bg_name, str(nbots), s, str(rep)])]
                        info['nums_bots'] += [nbots]
                        info['strategies'] += [s]
                        info['noises'] += [bg_name]
                        
    return info, full_dir


def get_noise_string(noise):    
    if noise == 0:
        return '0'
    else:
        return '2e' + str(int(np.log2(noise)))
