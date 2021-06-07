import os
import sys
import copy

sys.path.append('./player_model/')
sys.path.append('./simulations/')
sys.path.append('./utils/')

import simulation_utils
import config
import exp_config

import pandas as pd
import numpy as np

from multiprocessing import Pool
from basic_bot import *
from rectangular_world import RectangularWorld
from environment import *
from centroid_manager import *

def write(pid, p, model, tick, out_file, goal, experiment):
    bg, nbots, strategy, rep = experiment.split('-')
    out = [experiment, nbots, pid, tick, 'true', model.state, p.pos[0], p.pos[1],
           p.speed, p.angle, p.curr_background, model.prob_explore, strategy,
           goal[0], goal[1]]
    out = list(map(str, out))
    out_file.write(','.join(out) + '\n')

def write_centers(centers, center_file):    
    centers = np.array([[np.nan,np.nan] if x is None else x for x in centers])
    df = pd.DataFrame(centers)
    df.columns = ['x_pos','y_pos']
    df.to_csv(center_file, index = False)

reps = exp_config.simulation_reps
info, out_dir = exp_config.get_emergent_config(reps)

def run_simulation(exp_ind):
    print(exp_ind)
    experiment = info['experiments'][exp_ind]    
    bg = info['background_types'][exp_ind]
    nbots = info['nums_bots'][exp_ind]
    strategy = info['strategies'][exp_ind]
    probs = [None] if strategy in ['asocial', 'smart'] else [0.1,.25,.5,.75,.9]
    environment = lambda bg: RectangularWorld(bg, config.GAME_LENGTH, False,
                                              config.DISCRETE_BG_RADIUS, False)
    centers = {'player': simulation_utils.random_walk_centers(environment)}
    models = [BasicBot(environment, [True]*nbots, strategy, i, 
                       prob_explore = np.random.choice(probs))
              for i in range(nbots)]

    # write centers to file
    write_centers(centers['player'], out_dir + experiment + '-bg.csv')

    # Initialize world
    world = World(environment, noise_location = None, n_players = len(models),
                  stop_and_click = config.STOP_AND_CLICK)
    world.world_model.centers = centers['player']
    world.advance() 
    world.time = 0        

    with open(out_dir + experiment + '-simulation.csv', 'w') as out_f:
        out_f.write('exp,nbots,pid,tick,active,state,x_pos,y_pos,velocity,angle,bg_val,\
                     prob_explore,strategy,goal_x,goal_y\n')

        # Write initial states
        for i in range(len(models)):
            p = world.players[i]
            write(i, p, models[i], 0, out_f, ['', ''], experiment)

        # simulate ticks
        for tick in range(1, world.game_length):
            simulate_tick(tick, models, world, out_f, experiment)

def simulate_tick(tick, models, world, out_file, experiment):
    models_copy = copy.deepcopy(models)
    goals = [['',''] for i in range(len(models))]
    for i in range(len(models)):        
        pos, bg_val, others, time = world.get_obs(i)
        models[i].observe(pos, bg_val, time)            
        goals[i], slow = models[i].act(world.players[i], models_copy)
        
    world.advance()
    for i in range(len(models)):
        write(i, world.players[i], models[i], tick, out_file, goals[i], experiment)
    

if __name__ == '__main__':
  p = Pool(exp_config.num_procs)
  p.map(run_simulation, range(len(info['experiments'])))
#    run_simulation(10)
