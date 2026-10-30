#!/usr/bin/env python3
"""Independent reference path solver for KLA 2025 workshop milestones 1-4.

The solver is separate from the public repositories and never modifies their code.
It uses exact Held-Karp for <= 14 dies (milestones 1/2), and a feasible
nearest-neighbour/2-opt heuristic for larger or obstacle-constrained instances.
A feasible result is NOT a proof of global optimality.
"""
from __future__ import annotations
import argparse
import heapq
import json
import math
from pathlib import Path

EPS = 0.001
TOL = 1e-7

def distance(a, b):
    return math.hypot(a[0]-b[0], a[1]-b[1])

def die_center(die):
    corners = die['Corners']
    return [sum(p[0] for p in corners)/len(corners),sum(p[1] for p in corners)/len(corners)]

def die_angle(die):
    a,b=die['Corners'][:2]
    return math.degrees(math.atan2(b[1]-a[1],b[0]-a[0])) % 180

def rotation_distance(a,b):
    return min(abs((b-a)+90*k) for k in range(-4,5))

def motion_time(s, v, a):
    if s < TOL: return 0.0
    if v <= 0: raise ValueError('Velocity must be positive')
    if a <= 0: return s/v
    acceleration_distance=v*v/a
    return 2*math.sqrt(s/a) if s <= acceleration_distance else 2*v/a+(s-acceleration_distance)/v

def segment_crosses_rect(a,b,rect):
    """Liang-Barsky, closed forbidden rectangle (touching boundary is collision)."""
    x1,y1=rect['BottomLeft']; x2,y2=rect['TopRight']
    dx=b[0]-a[0];dy=b[1]-a[1]
    low,high=0.0,1.0
    for p,q in ((-dx,a[0]-x1),(dx,x2-a[0]),(-dy,a[1]-y1),(dy,y2-a[1])):
        if abs(p)<1e-12:
            if q<0: return False
            continue
        t=q/p
        if p<0:low=max(low,t)
        else:high=min(high,t)
        if low>high: return False
    return low<=high and high>=0 and low<=1

def path_is_clear(points, obstacles):
    return all(not segment_crosses_rect(a,b,z) for a,b in zip(points,points[1:]) for z in obstacles)

def point_blocked(p,obstacles):
    return any(z['BottomLeft'][0]<=p[0]<=z['TopRight'][0] and z['BottomLeft'][1]<=p[1]<=z['TopRight'][1] for z in obstacles)

class ObstacleRouter:
    def __init__(self,obstacles):
        self.obstacles=obstacles
        self.corners=[]
        for z in obstacles:
            x1,y1=z['BottomLeft'];x2,y2=z['TopRight']
            for p in ([x1-EPS,y1-EPS],[x1-EPS,y2+EPS],[x2+EPS,y1-EPS],[x2+EPS,y2+EPS]):
                if not point_blocked(p,obstacles): self.corners.append(p)
        self.adj=[[] for _ in self.corners]
        for i,a in enumerate(self.corners):
            for j in range(i+1,len(self.corners)):
                b=self.corners[j]
                if self.visible(a,b):
                    d=distance(a,b);self.adj[i].append((j,d));self.adj[j].append((i,d))
        self.cache={}
    def visible(self,a,b):
        return all(not segment_crosses_rect(a,b,z) for z in self.obstacles)
    def route(self,a,b):
        key=(tuple(a),tuple(b))
        if key in self.cache:return self.cache[key]
        if point_blocked(a,self.obstacles) or point_blocked(b,self.obstacles):
            raise ValueError('Start or target lies inside forbidden region')
        if self.visible(a,b):
            self.cache[key]=[list(a),list(b)];return self.cache[key]
        n=len(self.corners); nodes=self.corners+[list(a),list(b)];s=n;t=n+1
        adj=[list(e) for e in self.adj]+[[],[]]
        for i,p in enumerate(self.corners):
            if self.visible(a,p):
                v=distance(a,p);adj[s].append((i,v));adj[i].append((s,v))
            if self.visible(b,p):
                v=distance(b,p);adj[t].append((i,v));adj[i].append((t,v))
        if self.visible(a,b):
            adj[s].append((t,distance(a,b)));adj[t].append((s,distance(a,b)))
        pq=[(0.0,s)];dists=[float('inf')]*len(nodes);dists[s]=0.0;prev={}
        while pq:
            val,u=heapq.heappop(pq)
            if val>dists[u]+1e-9:continue
            if u==t:break
            for v,w in adj[u]:
                nv=val+w
                if nv<dists[v]-1e-9:
                    dists[v]=nv;prev[v]=u;heapq.heappush(pq,(nv,v))
        if t not in prev:raise ValueError('No collision-free route between points')
        ix=t;route=[]
        while True:
            route.append(nodes[ix]);
            if ix==s:break
            ix=prev[ix]
        route.reverse()
        assert path_is_clear(route,self.obstacles)
        self.cache[key]=route
        self.cache[(tuple(b),tuple(a))]=list(reversed(route))
        return route

def leg_cost(polyline,from_angle,to_angle,params):
    movement=sum(motion_time(distance(a,b),params['StageVelocity'],params.get('StageAcceleration',0)) for a,b in zip(polyline,polyline[1:]))
    camera_speed=params.get('CameraVelocity',0)
    rotation=motion_time(rotation_distance(from_angle,to_angle),camera_speed,params.get('CameraAcceleration',0)) if camera_speed>0 else 0
    return max(movement,rotation)

def route_order(params, centers, angles, router, exact_threshold=14):
    n=len(centers);start=params['InitialPosition'];start_angle=params.get('InitialAngle',0)
    nodes=[start]+centers;angs=[start_angle]+angles
    polylines={};weights={}
    for i in range(n+1):
        for j in range(n+1):
            if i==j:continue
            # Reverse travel costs symmetric except angles, which are also symmetric.
            poly=router.route(nodes[i],nodes[j]) if router else [nodes[i],nodes[j]]
            polylines[i,j]=poly
            weights[i,j]=leg_cost(poly,angs[i],angs[j],params)
    if n<=exact_threshold:
        # Held-Karp exact open Hamiltonian path starting at initial position.
        dp={};parent={}
        for i in range(n):dp[1<<i,i]=weights[0,i+1]
        for mask in range(1,1<<n):
            for last in range(n):
                if (mask,last) not in dp:continue
                val=dp[mask,last]
                for nxt in range(n):
                    if mask>>nxt&1:continue
                    key=(mask|1<<nxt,nxt);new=val+weights[last+1,nxt+1]
                    if new<dp.get(key,float('inf')):
                        dp[key]=new;parent[key]=last
        full=(1<<n)-1
        last=min(range(n),key=lambda i:dp[full,i]);order=[];mask=full
        while last>=0:
            order.append(last);p=parent.get((mask,last),-1);mask^=1<<last;last=p
        order.reverse();return order,polylines,weights,True
    # Construct several deterministic nearest-neighbour routes, optimize each with 2-opt.
    best=None;best_val=float('inf')
    candidates=sorted(range(n),key=lambda i:weights[0,i+1])[:min(n,8)]
    for first in candidates:
        order=[first];remaining=set(range(n));remaining.remove(first)
        while remaining:
            nxt=min(remaining,key=lambda i:(weights[order[-1]+1,i+1],i));order.append(nxt);remaining.remove(nxt)
        def score(o):
            return weights[0,o[0]+1]+sum(weights[a+1,b+1] for a,b in zip(o,o[1:]))
        score_now=score(order)
        for _ in range(25):
            improvement=None
            for i in range(n-1):
                for j in range(i+1,n):
                    before=(weights[0,order[0]+1] if i==0 else weights[order[i-1]+1,order[i]+1])
                    after=(weights[0,order[j]+1] if i==0 else weights[order[i-1]+1,order[j]+1])
                    if j+1<n:
                        before+=weights[order[j]+1,order[j+1]+1]
                        after+=weights[order[i]+1,order[j+1]+1]
                    delta=after-before
                    if delta < -1e-9 and (improvement is None or delta<improvement[0]):improvement=(delta,i,j)
            if improvement is None:break
            delta,i,j=improvement;order[i:j+1]=reversed(order[i:j+1]);score_now+=delta
        if score_now<best_val:best_val=score_now;best=order
    return best,polylines,weights,False

def solve(params, milestone):
    centers=[die_center(d) for d in params['Dies']]
    angles=[die_angle(d) for d in params['Dies']]
    obstacles=params.get('ForbiddenZones',[]) if milestone==4 else []
    router=ObstacleRouter(obstacles) if obstacles else None
    order,polylines,weights,exact=route_order(params,centers,angles,router,exact_threshold=14)
    points=[list(params['InitialPosition'])];total=0
    last=0
    for ix in order:
        key=(last,ix+1);poly=polylines[key]
        points.extend(poly[1:]);total+=weights[key];last=ix+1
    assert len(set(order))==len(centers)
    assert path_is_clear(points,obstacles)
    return {'TotalTime':total,'Path':points}, {'optimality_proven':exact,'die_count':len(centers),'waypoints':len(points)-len(centers)-1}

def validate(params,result,milestone):
    centers=[die_center(d) for d in params['Dies']]
    points=result['Path']
    if distance(points[0],params['InitialPosition'])>1e-5:raise ValueError('Incorrect initial position')
    if not path_is_clear(points,params.get('ForbiddenZones',[]) if milestone==4 else []):raise ValueError('Forbidden-zone collision')
    remaining=set(range(len(centers)));visited=[]
    for p in points[1:]:
        for ix in sorted(remaining):
            if distance(p,centers[ix])<=1e-5:
                remaining.remove(ix);visited.append(ix);break
    if remaining:raise ValueError(f'Missing {len(remaining)} die centers')
    if len(visited)!=len(centers):raise ValueError('Incorrect die visit count')
    return {'all_dies_visited':True,'collision_free':True,'die_count':len(centers)}

def main():
    p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('output');p.add_argument('--milestone',type=int,required=True,choices=[1,2,3,4]);args=p.parse_args()
    params=json.loads(Path(args.input).read_text())
    result,meta=solve(params,args.milestone)
    validate(params,result,args.milestone)
    Path(args.output).parent.mkdir(parents=True,exist_ok=True)
    Path(args.output).write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'output':args.output,'total_time':result['TotalTime'],**meta}))
if __name__=='__main__':main()