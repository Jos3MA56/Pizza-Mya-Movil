import React from 'react';
import {CocinaEstacionScreen} from './CocinaEstacionScreen';
import type {CocinaViewModel} from '../../viewmodels/useCocinaViewModel';
export function CocinaPizzasScreen({vm}:{vm:CocinaViewModel}){return <CocinaEstacionScreen vm={vm} titulo="Pizzas"/>;}
