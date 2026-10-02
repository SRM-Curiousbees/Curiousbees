// Unit tests never need the network: any connection that leaves this machine fails.
import { blockNonLocalConnections } from './network-guard';

blockNonLocalConnections();
