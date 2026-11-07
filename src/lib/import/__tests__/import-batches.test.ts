import {describe,it,expect,vi} from 'vitest';
import {importInBatches} from '../import-batches';
describe('bounded import requests',()=>{
 it('processes ordered chunks sequentially and reports committed progress',async()=>{
  const rows=Array.from({length:121},(_,i)=>i),progress=vi.fn();let inFlight=false;
  const send=vi.fn(async(chunk:number[])=>{expect(inFlight).toBe(false);inFlight=true;await Promise.resolve();inFlight=false;return {imported:chunk.length};});
  const result=await importInBatches(rows,send,progress);
  expect(send.mock.calls.map(([chunk])=>chunk.length)).toEqual([50,50,21]);
  expect(send.mock.calls.flatMap(([chunk])=>chunk)).toEqual(rows);
  expect(progress.mock.calls.map(([r])=>r.imported)).toEqual([50,100,121]);
  expect(result).toMatchObject({imported:121,requested:121,errors:[]});
 });
 it('stops after an uncertain request without replaying it or submitting later rows',async()=>{
  const send=vi.fn().mockResolvedValueOnce({imported:50}).mockRejectedValueOnce(Error('Connection lost'));
  await expect(importInBatches(Array(151).fill(0),send)).rejects.toThrow('50 of 151 imports confirmed');
  expect(send).toHaveBeenCalledTimes(2);
 });
 it('retains partial counts and stops on row failures',async()=>{
  const send=vi.fn().mockResolvedValue({imported:5,skipped:2,errors:['Changed elsewhere']});
  const result=await importInBatches(Array(100).fill(0),send);
  expect(result).toMatchObject({imported:5,skipped:2,requested:100,errors:['Changed elsewhere']});expect(send).toHaveBeenCalledTimes(1);
 });
 it('continues past idempotent skips but rejects impossible completion counts',async()=>{
  const send=vi.fn().mockResolvedValueOnce({imported:0,skipped:50}).mockResolvedValueOnce({imported:1});
  expect(await importInBatches(Array(51).fill(0),send)).toMatchObject({imported:1,skipped:50,requested:51});
  await expect(importInBatches([1],async()=>({imported:2}))).rejects.toThrow('invalid completion count');
 });
});
