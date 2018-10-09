import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import socketIO from 'socket.io-client';

const styles = theme => ({
  root: {
    width: '100%',
    marginTop: theme.spacing.unit * 3,
    overflowX: 'auto',
  },
  table: {
    minWidth: 700,
  },
});

class SimpleTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = { rows: [] };
  }
  componentDidMount() {
    this.socket = socketIO('localhost:8080');
    this.socket.on('data', data => {
      this.handleSocketMsg(data);
    });
  }
  handleSocketMsg(data) {
    this.setState({
      rows: data
    });
  }
  render() {
    const { classes } = this.props;

    return (
      <Paper className={classes.root}>
        <Table className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell>SYMBOL</TableCell>
              <TableCell>ACTION</TableCell>
              <TableCell numeric>SIGNAL COUNT</TableCell>
              <TableCell>CHART URL</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {this.state.rows.map(row => {
              return (
                <TableRow key={row.symbol}>
                  <TableCell component="th" scope="row">
                    {row.symbol}
                  </TableCell>
                  <TableCell>{row.action}</TableCell>
                  <TableCell numeric>{row.signalCount}</TableCell>
                  <TableCell numeric>
                    <a rel="noopener noreferrer" target="_blank" href={row.chartUrl}>CHART</a>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
    );
  }
}

SimpleTable.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(SimpleTable);
